import hashlib
import json
import re
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select, delete
from . import models as m, schemas as s
from .db import DATA_DIR
from .security import context, CLINICAL, check_version
from .serialization import serialize, encounter_out

router=APIRouter(prefix='/api')
RECORDS={'history':m.History,'diagnoses':m.Diagnosis,'allergies':m.Allergy,'medications':m.Medication,
    'vitals':m.Vital,'orders':m.ClinicalOrder,'weekly':m.WeeklyAssessment,'tasks':m.Task,'entries':m.PatientEntry,'messages':m.Message}
WRITE_ROLES={'history':{'doctor','assistant'},'diagnoses':{'doctor'},'allergies':{'doctor','assistant'},'medications':{'doctor'},
    'vitals':{'doctor','assistant','therapist'},'orders':{'doctor'},'weekly':{'therapist','doctor'},
    'tasks':{'doctor','assistant','therapist','reception','billing','admin'},'entries':{'doctor','assistant','therapist'},
    'messages':{'doctor','assistant','therapist','admin','reception','billing'}}


def draft_encounter(c,identifier,patient_id=None,write=False):
    row=c.record(m.Encounter,identifier)
    if patient_id and row.patient_id!=patient_id: raise HTTPException(422,'Encounter belongs to another patient')
    if row.status!='draft': raise HTTPException(409,'Signed encounter is immutable. Use an amendment.')
    if write and c.user.id!=row.provider_id: raise HTTPException(403,'Only the assigned clinician may edit this encounter')
    return row


@router.get('/records/{kind}')
def records(kind:str,c=Depends(context)):
    if kind not in RECORDS: raise HTTPException(404,'Unknown record type')
    if kind not in ('tasks','messages'): c.allow(CLINICAL)
    model=RECORDS[kind]
    query=select(model).where(model.facility_id==c.facility_id)
    if kind=='messages': query=query.where((model.author_id==c.user.id)|(model.recipient_id==c.user.id))
    if kind=='tasks' and c.user.role not in ('admin','doctor','reception'): query=query.where(model.assignee_id==c.user.id)
    return [serialize(x) for x in c.db.scalars(query.order_by(model.created_at.desc()).limit(1000))]


@router.post('/records/{kind}')
def create_record(kind:str,data:dict,c=Depends(context)):
    if kind not in RECORDS: raise HTTPException(404,'Unknown record type')
    c.allow(WRITE_ROLES[kind]); parsed=s.RECORD_SCHEMAS[kind].model_validate(data); values=parsed.model_dump()
    c.patient(values['patient_id'])
    eid=values.get('encounter_id')
    if eid:
        encounter=draft_encounter(c,eid,values['patient_id'],kind in ('diagnoses','medications','orders'))
        if c.user.role=='assistant' and encounter.assistant_id!=c.user.id: raise HTTPException(403,'Encounter is not assigned to you')
    if kind=='vitals':
        if c.user.role=='assistant' and not eid: raise HTTPException(422,'Assistants must select their assigned encounter')
        if not any(values.get(f['name']) is not None and values.get(f['name'])!='' for f in s.VITAL_FIELDS): raise HTTPException(422,'Record at least one measurement')
    if kind=='medications':
        if values['duration_days']<1 or values['quantity']<1: raise HTTPException(422,'Duration and quantity must be positive')
        if not re.fullmatch(r'\d+(?:\.\d+)?-\d+(?:\.\d+)?-\d+(?:\.\d+)?-\d+(?:\.\d+)?',values['maen']): raise HTTPException(422,'Use four numeric M-A-E-N doses separated by hyphens')
    if kind=='tasks': c.staff(values['assignee_id'])
    if kind=='messages': c.staff(values['recipient_id'])
    if kind=='weekly':
        plan=c.record(m.Plan,values['plan_id'])
        if plan.patient_id!=values['patient_id']: raise HTTPException(422,'Plan and patient do not match')
        if c.user.role=='therapist' and plan.therapist_id!=c.user.id: raise HTTPException(403,'Plan is assigned to another therapist')
        if not 1<=values['week_number']<=((plan.session_count+6)//7): raise HTTPException(422,'Week is outside the treatment plan')
    row=RECORDS[kind](**values,facility_id=c.facility_id,author_id=c.user.id)
    c.db.add(row); c.audit('create_'+kind,row)
    return serialize(row)


@router.post('/records/{kind}/{identifier}/status')
def record_status(kind:str,identifier:str,data:s.StatusChange,c=Depends(context)):
    if kind not in ('diagnoses','allergies','medications','tasks','entries'): raise HTTPException(404,'Status change unavailable')
    c.allow(WRITE_ROLES[kind]); row=c.record(RECORDS[kind],identifier); check_version(row,data.version)
    if kind=='tasks' and row.assignee_id!=c.user.id and c.user.role not in ('admin','doctor','reception'): raise HTTPException(403,'Task belongs to another staff member')
    allowed={'diagnoses':{'active','resolved'},'allergies':{'active','inactive'},'medications':{'draft','discontinued'},'tasks':{'pending','completed'},'entries':{'active','resolved'}}
    if data.status not in allowed[kind]: raise HTTPException(422,'Invalid status')
    if kind in ('medications','diagnoses') and row.encounter_id: draft_encounter(c,row.encounter_id,write=True)
    row.status=data.status; row.version+=1; c.audit('status_'+kind,row)
    return serialize(row)


@router.get('/encounters')
def encounters(c=Depends(context)):
    c.allow(CLINICAL)
    return [encounter_out(c.db,x) for x in c.db.scalars(select(m.Encounter).where(m.Encounter.facility_id==c.facility_id).order_by(m.Encounter.created_at.desc()).limit(500))]


@router.post('/encounters')
def create_encounter(data:s.EncounterInput,c=Depends(context)):
    c.allow({'doctor'}); c.patient(data.patient_id); c.staff(data.provider_id,{'doctor'})
    if data.provider_id!=c.user.id: raise HTTPException(403,'Create encounters under your own clinician account')
    if data.assistant_id: c.staff(data.assistant_id,{'assistant'})
    if data.appointment_id:
        appointment=c.record(m.Appointment,data.appointment_id)
        if appointment.patient_id!=data.patient_id or appointment.provider_id!=data.provider_id: raise HTTPException(422,'Appointment does not match patient and provider')
        if appointment.status in ('cancelled','missed'): raise HTTPException(409,'Appointment is inactive')
    row=m.Encounter(**data.model_dump(),facility_id=c.facility_id,author_id=c.user.id)
    c.db.add(row); c.audit('create_encounter',row)
    return encounter_out(c.db,row)


def revision(c,row,action):
    c.db.flush()
    snapshot=json.dumps(encounter_out(c.db,row),sort_keys=True)
    c.db.add(m.NoteRevision(encounter_id=row.id,actor_id=c.user.id,action=action,snapshot=snapshot))
    return snapshot


@router.put('/encounters/{identifier}')
def save_note(identifier:str,data:s.NoteInput,c=Depends(context)):
    c.allow({'doctor'}); row=draft_encounter(c,identifier,write=True); check_version(row,data.version)
    revision(c,row,'before_edit')
    for key,value in data.model_dump(exclude={'version','symptoms'}).items(): setattr(row,key,value)
    names=[x.name for x in data.symptoms]
    if len(names)!=len(set(names)): raise HTTPException(422,'Duplicate symptom name')
    c.db.execute(delete(m.Symptom).where(m.Symptom.encounter_id==row.id))
    for symptom in data.symptoms: c.db.add(m.Symptom(encounter_id=row.id,**symptom.model_dump()))
    row.version+=1; c.audit('save_draft',row)
    return encounter_out(c.db,row)


@router.post('/encounters/{identifier}/sign')
def sign_note(identifier:str,data:s.Version,c=Depends(context)):
    c.allow({'doctor'}); row=draft_encounter(c,identifier,write=True); check_version(row,data.version)
    if not all([row.chief_complaint.strip(),row.assessment.strip(),row.plan.strip()]): raise HTTPException(422,'Chief complaint, assessment, and plan are required to sign')
    row.status='signed'; row.signed_by=c.user.id; row.signed_at=m.now(); row.version+=1
    with c.db.no_autoflush:
        content=encounter_out(c.db,row)
        content.pop('signature_digest',None)
        row.signature_digest=hashlib.sha256(json.dumps(content,sort_keys=True).encode()).hexdigest()
    revision(c,row,'signed')
    if row.appointment_id:
        appointment=c.record(m.Appointment,row.appointment_id)
        if not appointment.plan_id: appointment.status='completed'; appointment.version+=1
    c.audit('sign_encounter',row)
    return encounter_out(c.db,row)


@router.post('/encounters/{identifier}/amend')
def amend(identifier:str,data:s.AmendmentInput,c=Depends(context)):
    c.allow({'doctor'}); row=c.record(m.Encounter,identifier)
    if row.status!='signed': raise HTTPException(409,'Only signed encounters can be amended')
    amendment=m.Amendment(encounter_id=row.id,author_id=c.user.id,**data.model_dump()); c.db.add(amendment)
    c.audit('amend_encounter',row); revision(c,row,'amendment_added')
    return encounter_out(c.db,row)


@router.post('/encounters/{identifier}/carry-forward')
def carry_forward(identifier:str,data:s.CarryInput,c=Depends(context)):
    c.allow({'doctor'}); row=draft_encounter(c,identifier,write=True); check_version(row,data.version)
    source=c.record(m.Encounter,data.source_id)
    if source.patient_id!=row.patient_id or source.id==row.id or source.status!='signed': raise HTTPException(422,'Choose a signed previous encounter for this patient')
    revision(c,row,'before_carry_forward')
    stamp=source.signed_at.isoformat()+'Z'
    text=getattr(source,data.section)
    if not text: raise HTTPException(422,'The selected historical section is empty')
    setattr(row,data.section,getattr(row,data.section)+f'\n[Historical text from {stamp}; reassess for this visit]\n'+text)
    c.db.add(m.CarryForward(encounter_id=row.id,source_id=source.id,section=data.section,source_date=source.signed_at,actor_id=c.user.id))
    row.version+=1; c.audit('carry_forward',row)
    return encounter_out(c.db,row)


@router.get('/encounters/{identifier}/history')
def note_history(identifier:str,c=Depends(context)):
    c.allow(CLINICAL); row=c.record(m.Encounter,identifier)
    return [serialize(x) for x in c.db.scalars(select(m.NoteRevision).where(m.NoteRevision.encounter_id==row.id).order_by(m.NoteRevision.created_at.desc()))]


@router.post('/orders/{identifier}/result')
def result(identifier:str,data:s.ResultInput,c=Depends(context)):
    c.allow({'doctor','assistant'}); row=c.record(m.ClinicalOrder,identifier); check_version(row,data.version)
    if row.status=='reviewed': raise HTTPException(409,'Reviewed result is immutable; add a new order or amendment')
    row.result=data.result; row.status='resulted'; row.version+=1
    c.db.execute(delete(m.LabValue).where(m.LabValue.order_id==row.id))
    for value in data.values:
        if not {'parameter','value'}<=value.keys() or set(value)-{'parameter','value','unit','reference_range'} or any(len(v)>100 for v in value.values()): raise HTTPException(422,'Invalid structured result')
        c.db.add(m.LabValue(order_id=row.id,**value))
    c.audit('record_result',row)
    return serialize(row)


@router.post('/orders/{identifier}/review')
def review(identifier:str,data:s.Version,c=Depends(context)):
    c.allow({'doctor'}); row=c.record(m.ClinicalOrder,identifier); check_version(row,data.version)
    if row.status!='resulted': raise HTTPException(409,'Only a resulted order can be reviewed')
    row.status='reviewed'; row.reviewed_by=c.user.id; row.reviewed_at=m.now(); row.version+=1; c.audit('review_result',row)
    return serialize(row)


@router.post('/documents')
async def upload(patient_id:str=Form(...),title:str=Form(...),order_id:str|None=Form(None),file:UploadFile=File(...),c=Depends(context)):
    c.allow(CLINICAL); c.patient(patient_id)
    if not title.strip() or len(title)>180: raise HTTPException(422,'A document title of 1–180 characters is required')
    if order_id:
        order=c.record(m.ClinicalOrder,order_id)
        if order.patient_id!=patient_id: raise HTTPException(422,'Order belongs to another patient')
    content=await file.read(10*1024*1024+1)
    if len(content)>10*1024*1024: raise HTTPException(413,'Documents are limited to 10 MB')
    if content.startswith(b'%PDF-'): mime='application/pdf'; suffix='.pdf'
    elif content.startswith(b'\x89PNG\r\n\x1a\n'): mime='image/png'; suffix='.png'
    elif content.startswith(b'\xff\xd8\xff'): mime='image/jpeg'; suffix='.jpg'
    else: raise HTTPException(422,'Upload a PDF, PNG, or JPEG document')
    key=str(uuid4()); folder=DATA_DIR/'documents'; folder.mkdir(exist_ok=True)
    (folder/key).write_bytes(content)
    row=m.Document(patient_id=patient_id,facility_id=c.facility_id,author_id=c.user.id,title=title.strip(),
        filename='document'+suffix,storage_key=key,mime=mime,size=len(content),sha256=hashlib.sha256(content).hexdigest(),order_id=order_id)
    c.db.add(row); c.audit('upload_document',row)
    return serialize(row)


@router.get('/documents/{identifier}/download')
def download(identifier:str,c=Depends(context)):
    c.allow(CLINICAL); row=c.record(m.Document,identifier)
    path=DATA_DIR/'documents'/row.storage_key
    if not path.is_file(): raise HTTPException(404,'Document file is unavailable')
    c.audit('download_document',row)
    return FileResponse(path,media_type='application/octet-stream',filename=row.filename,headers={'X-Content-Type-Options':'nosniff'})

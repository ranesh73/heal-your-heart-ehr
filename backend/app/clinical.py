from datetime import datetime, date
import hashlib
import json
import re
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select, delete, update
from . import models as m, schemas as s
from .db import DATA_DIR
from .security import context, CLINICAL, check_version
from .serialization import serialize, encounter_out

router=APIRouter(prefix='/api')
RECORDS={'history':m.History,'diagnoses':m.Diagnosis,'allergies':m.Allergy,'medications':m.Medication,
    'vitals':m.Vital,'orders':m.ClinicalOrder,'weekly':m.WeeklyAssessment,'tasks':m.Task,'entries':m.PatientEntry,
    'messages':m.Message,'injections':m.Injection,'vaccines':m.Vaccine}
WRITE_ROLES={'history':{'doctor','assistant'},'diagnoses':{'doctor'},'allergies':{'doctor','assistant'},'medications':{'doctor'},
    'vitals':{'doctor','assistant','therapist'},'orders':{'doctor','assistant'},'weekly':{'therapist','doctor'},
    'tasks':{'doctor','assistant','therapist','reception','billing','admin'},'entries':{'doctor','assistant','therapist'},
    'messages':{'doctor','assistant','therapist','admin','reception','billing'},
    'injections':{'doctor','assistant','therapist'},'vaccines':{'doctor','assistant'}}


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
    rows = c.db.scalars(query.order_by(model.created_at.desc()).limit(1000)).all()
    if kind == 'orders':
        out = []
        for r in rows:
            d = serialize(r)
            d['values'] = [serialize(v) for v in c.db.scalars(select(m.LabValue).where(m.LabValue.order_id==r.id))]
            d['documents'] = [serialize(doc) for doc in c.db.scalars(select(m.Document).where(m.Document.order_id==r.id))]
            p = c.db.get(m.Patient, r.patient_id)
            if p:
                d['patient_name'] = f"{p.first_name} {p.last_name}".strip()
                d['patient_mrn'] = p.mrn
                d['patient_sex'] = p.sex
                d['patient_dob'] = str(p.dob) if p.dob else ''
            staff = c.db.get(m.User, r.author_id)
            if staff:
                d['ordered_by'] = f"Dr. {staff.name}" if not staff.name.startswith('Dr.') else staff.name
            out.append(d)
        return out
    if kind == 'medications':
        out = []
        for r in rows:
            d = serialize(r)
            d['drug_name'] = r.trade_name or r.generic_name or 'Medication'
            d['dosage'] = r.dose or ''
            d['dispense'] = f"{r.quantity or 30} {r.dispense_unit or 'Tablets'}"
            d['period'] = f"{r.duration_days or 30} Days"
            if r.author_id:
                staff = c.db.get(m.User, r.author_id)
                if staff:
                    d['provider_name'] = staff.name
            out.append(d)
        return out
    if kind == 'injections':
        out = []
        for r in rows:
            d = serialize(r)
            p = c.db.get(m.Patient, r.patient_id)
            if p:
                d['patient_name'] = f"{p.first_name} {p.last_name}".strip()
                d['patient_mrn'] = p.mrn
            if r.administered_by:
                staff = c.db.get(m.User, r.administered_by)
                if staff: d['administered_by_name'] = staff.name
            if r.author_id:
                staff = c.db.get(m.User, r.author_id)
                if staff: d['ordered_by_name'] = f"Dr. {staff.name}" if not staff.name.startswith("Dr.") else staff.name
            out.append(d)
        return out
    if kind == 'vaccines':
        out = []
        for r in rows:
            d = serialize(r)
            p = c.db.get(m.Patient, r.patient_id)
            if p:
                d['patient_name'] = f"{p.first_name} {p.last_name}".strip()
                d['patient_mrn'] = p.mrn
            if r.administered_by:
                staff = c.db.get(m.User, r.administered_by)
                if staff: d['administered_by_name'] = staff.name
            if r.ordered_by:
                staff = c.db.get(m.User, r.ordered_by)
                if staff: d['ordered_by_name'] = f"Dr. {staff.name}" if not staff.name.startswith("Dr.") else staff.name
            elif r.author_id:
                staff = c.db.get(m.User, r.author_id)
                if staff: d['ordered_by_name'] = f"Dr. {staff.name}" if not staff.name.startswith("Dr.") else staff.name
            out.append(d)
        return out
    return [serialize(x) for x in rows]


def next_lab_ref(db):
    seq = db.get(m.Sequence, 'LAB-REF')
    if not seq:
        seq = m.Sequence(key='LAB-REF', value=20730)
        db.add(seq)
    seq.value += 1
    db.flush()
    return f'{seq.value:08d}'


def next_image_ref(db):
    seq = db.get(m.Sequence, 'IMAGE-REF')
    if not seq:
        seq = m.Sequence(key='IMAGE-REF', value=9540)
        db.add(seq)
    seq.value += 1
    db.flush()
    return f'{seq.value:08d}'


@router.post('/records/{kind}')
def create_record(kind:str,data:dict,c=Depends(context)):
    if kind not in RECORDS: raise HTTPException(404,'Unknown record type')
    c.allow(WRITE_ROLES[kind])
    if kind == 'medications':
        out = []
        for r in rows:
            d = serialize(r)
            d['drug_name'] = r.trade_name or r.generic_name or 'Medication'
            d['dosage'] = r.dose or ''
            d['dispense'] = f"{r.quantity or 30} {r.dispense_unit or 'Tablets'}"
            d['period'] = f"{r.duration_days or 30} Days"
            if r.author_id:
                staff = c.db.get(m.User, r.author_id)
                if staff:
                    d['provider_name'] = staff.name
            out.append(d)
        return out
    if kind == 'injections':
        data = dict(data)
        if 'dosage' in data and not data.get('dose'):
            data['dose'] = data['dosage']
        if 'dose' in data and not data.get('dosage'):
            data['dosage'] = data['dose']
        if isinstance(data.get('period'), str):
            num = re.search(r'\d+', str(data['period']))
            data['period'] = int(num.group()) if num else 1
        site_map = {'Deltoid - Left': 'Left Deltoid', 'Deltoid - Right': 'Right Deltoid', 'Gluteal - Left': 'Left Gluteal', 'Gluteal - Right': 'Right Gluteal', 'Abdomen - Upper Left': 'Abdomen Upper Left', 'Abdomen - Upper Right': 'Abdomen Upper Right', 'Abdomen - Lower Left': 'Abdomen Lower Left', 'Abdomen - Lower Right': 'Abdomen Lower Right', 'Vastus Lateralis - Left': 'Left Vastus Lateralis', 'Vastus Lateralis - Right': 'Right Vastus Lateralis'}
        if data.get('site') in site_map:
            data['site'] = site_map[data['site']]
    elif kind == 'vaccines':
        data = dict(data)
        if 'name' in data and not data.get('vaccine_name'):
            data['vaccine_name'] = data['name']
        if 'vaccine_name' in data and not data.get('name'):
            data['name'] = data['vaccine_name']
        if 'dosage' in data and not data.get('dose'):
            data['dose'] = data['dosage']
        if 'dose' in data and not data.get('dosage'):
            data['dosage'] = data['dose']
        if 'dose_in_series' in data and not data.get('series_number'):
            num = re.search(r'\d+', str(data['dose_in_series']))
            data['series_number'] = int(num.group()) if num else 1
        site_map = {'Deltoid - Left': 'Left Deltoid', 'Deltoid - Right': 'Right Deltoid', 'Anterolateral Thigh - Left': 'Left Thigh', 'Anterolateral Thigh - Right': 'Right Thigh', 'Nasal Mucosa': 'Oral'}
        if data.get('site') in site_map:
            data['site'] = site_map[data['site']]
    elif kind == 'medications':
        data = dict(data)
        if 'drug_name' in data and not data.get('trade_name'):
            data['trade_name'] = data['drug_name']
        if 'dosage' in data and not data.get('dose'):
            data['dose'] = data['dosage']
        if 'daw' in data and 'substitution_allowed' not in data:
            data['substitution_allowed'] = not data['daw']
        if 'period' in data and not data.get('duration_days'):
            num = re.search(r'\d+', str(data['period']))
            data['duration_days'] = int(num.group()) if num else 30
        if 'period_count' in data and not data.get('duration_days'):
            try:
                data['duration_days'] = int(data['period_count'])
            except Exception:
                data['duration_days'] = 30
        if not data.get('duration_days'):
            data['duration_days'] = 30
        if 'dispense' in data and not data.get('quantity'):
            num = re.search(r'\d+', str(data['dispense']))
            data['quantity'] = int(num.group()) if num else 30
        if 'dispense_count' in data and not data.get('quantity'):
            try:
                data['quantity'] = int(data['dispense_count'])
            except Exception:
                data['quantity'] = 30
        if not data.get('quantity'):
            data['quantity'] = 30
        if not data.get('route'):
            data['route'] = 'Oral'
        if not data.get('dose'):
            data['dose'] = '1 tab'
        if not data.get('trade_name'):
            data['trade_name'] = 'Prescribed Medication'
    elif kind == 'vitals':
        data = dict(data)
        if 'temp_f' in data and not data.get('temperature_f'):
            data['temperature_f'] = data['temp_f']
        if 'resp_rate' in data and not data.get('respiration_rate'):
            data['respiration_rate'] = data['resp_rate']
        if 'central_bp_sys' in data and not data.get('central_sys'):
            data['central_sys'] = data['central_bp_sys']
        if 'central_bp_dia' in data and not data.get('central_dia'):
            data['central_dia'] = data['central_bp_dia']
        if 'bmi' in data and not data.get('bmi_percentile'):
            data['bmi_percentile'] = data['bmi']
    valid_fields = set(s.RECORD_SCHEMAS[kind].model_fields.keys())
    cleaned_data = {k: v for k, v in data.items() if k in valid_fields}
    parsed = s.RECORD_SCHEMAS[kind].model_validate(cleaned_data)
    values = parsed.model_dump()
    c.patient(values['patient_id'])
    eid=values.get('encounter_id')
    if eid:
        encounter=draft_encounter(c,eid,values['patient_id'],kind in ('diagnoses','medications','orders'))
        if c.user.role=='assistant' and encounter.assistant_id!=c.user.id: raise HTTPException(403,'Encounter is not assigned to you')
    if kind=='orders':
        if values.get('kind')=='Lab':
            if not values.get('lab_ref'):
                values['lab_ref'] = next_lab_ref(c.db)
            if not values.get('status') or values.get('status')=='ordered':
                values['status'] = 'Pending'
            if not values.get('ordered_date'):
                values['ordered_date'] = datetime.now().strftime('%b %d, %Y')
        elif values.get('kind') in ('Image', 'Imaging'):
            values['kind'] = 'Image'
            if not values.get('lab_ref'):
                values['lab_ref'] = next_image_ref(c.db)
            if not values.get('status') or values.get('status')=='ordered':
                values['status'] = 'Pending'
            if not values.get('ordered_date'):
                values['ordered_date'] = datetime.now().strftime('%b %d, %Y')
    if kind=='vitals':
        if c.user.role=='assistant' and not eid: raise HTTPException(422,'Assistants must select their assigned encounter')
        if not any(values.get(f['name']) is not None and values.get(f['name'])!='' for f in s.VITAL_FIELDS): raise HTTPException(422,'Record at least one measurement')
    if kind=='medications':
        if values.get('morning') is not None or values.get('afternoon') is not None or values.get('evening') is not None or values.get('night') is not None:
            fmt = lambda x: str(int(x)) if isinstance(x, (int, float)) and x == int(x) else str(x)
            values['maen'] = f"{fmt(values.get('morning') or 0)}-{fmt(values.get('afternoon') or 0)}-{fmt(values.get('evening') or 0)}-{fmt(values.get('night') or 0)}"
        if values['duration_days']<1 or values['quantity']<1: raise HTTPException(422,'Duration and quantity must be positive')
        if not re.fullmatch(r'\d+(?:\.\d+)?-\d+(?:\.\d+)?-\d+(?:\.\d+)?-\d+(?:\.\d+)?',values['maen']): raise HTTPException(422,'Use four numeric M-A-E-N doses separated by hyphens')
        if not values.get('status'):
            values['status'] = 'active'
    if kind=='injections':
        if not values.get('administered_by'):
            values['administered_by'] = c.user.id
        if not values.get('administered_at'):
            values['administered_at'] = datetime.now()
        if not values.get('status'):
            values['status'] = 'administered'
    if kind=='vaccines':
        if not values.get('administered_by'):
            values['administered_by'] = c.user.id
        if not values.get('ordered_by'):
            values['ordered_by'] = c.user.id
        if not values.get('administered_at'):
            values['administered_at'] = datetime.now()
        if not values.get('status'):
            values['status'] = 'administered'
    if kind=='tasks': c.staff(values['assignee_id'])
    if kind=='messages': c.staff(values['recipient_id'])
    if kind=='weekly':
        plan=c.record(m.Plan,values['plan_id'])
        if plan.patient_id!=values['patient_id']: raise HTTPException(422,'Plan and patient do not match')
        if c.user.role=='therapist' and plan.therapist_id!=c.user.id: raise HTTPException(403,'Plan is assigned to another therapist')
        if not 1<=values['week_number']<=((plan.session_count+6)//7): raise HTTPException(422,'Week is outside the treatment plan')
    model_cls = RECORDS[kind]
    filtered_values = {k: v for k, v in values.items() if hasattr(model_cls, k)}
    if kind == 'injections' and 'dose' not in filtered_values and 'dosage' in values:
        filtered_values['dose'] = values['dosage']
    if kind == 'vaccines':
        if 'vaccine_name' not in filtered_values and 'name' in values:
            filtered_values['vaccine_name'] = values['name']
        if 'dose' not in filtered_values and 'dosage' in values:
            filtered_values['dose'] = values['dosage']
    if kind == 'vitals':
        if 'temperature_f' not in filtered_values and values.get('temp_f') is not None:
            filtered_values['temperature_f'] = values['temp_f']
        if 'respiration_rate' not in filtered_values and values.get('resp_rate') is not None:
            filtered_values['respiration_rate'] = values['resp_rate']
        if 'central_sys' not in filtered_values and values.get('central_bp_sys') is not None:
            filtered_values['central_sys'] = values['central_bp_sys']
        if 'central_dia' not in filtered_values and values.get('central_bp_dia') is not None:
            filtered_values['central_dia'] = values['central_bp_dia']
        if 'bmi_percentile' not in filtered_values and values.get('bmi') is not None:
            filtered_values['bmi_percentile'] = values['bmi']
    for k, v in list(filtered_values.items()):
        if v == '':
            filtered_values[k] = None
        elif isinstance(v, str):
            col = getattr(model_cls, k, None)
            if col is not None and hasattr(col, 'type'):
                col_name = type(col.type).__name__
                if col_name == 'DateTime':
                    try:
                        filtered_values[k] = datetime.fromisoformat(v)
                    except Exception:
                        filtered_values[k] = None
                elif col_name == 'Date':
                    try:
                        filtered_values[k] = date.fromisoformat(v[:10])
                    except Exception:
                        filtered_values[k] = None
    row = model_cls(**filtered_values, facility_id=c.facility_id, author_id=c.user.id)
    c.db.add(row); c.audit('create_'+kind,row)
    return serialize(row)


@router.post('/records/{kind}/{identifier}/status')
def record_status(kind:str,identifier:str,data:s.StatusChange,c=Depends(context)):
    if kind not in ('diagnoses','allergies','medications','tasks','entries','orders','injections','vaccines'): raise HTTPException(404,'Status change unavailable')
    c.allow(WRITE_ROLES[kind]); row=c.record(RECORDS[kind],identifier); check_version(row,data.version)
    if kind=='tasks' and row.assignee_id!=c.user.id and c.user.role not in ('admin','doctor','reception'): raise HTTPException(403,'Task belongs to another staff member')
    allowed={'diagnoses':{'active','resolved'},'allergies':{'active','inactive'},'medications':{'draft','active','discontinued','completed'},'tasks':{'pending','completed'},'entries':{'active','resolved'},
             'orders':{'Pending','Partial','Completed','ordered','resulted','reviewed','Expired','cancelled'},
             'injections':{'administered','ordered','cancelled'},'vaccines':{'administered','ordered','refused','historical'}}
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
    c.allow({'doctor','admin','assistant','reception'}); c.patient(data.patient_id); c.staff(data.provider_id,{'doctor'})
    if c.user.role == 'doctor' and data.provider_id != c.user.id:
        raise HTTPException(403,'Create encounters under your own clinician account')
    if data.assistant_id: c.staff(data.assistant_id,{'assistant'})
    if data.appointment_id:
        appointment=c.record(m.Appointment,data.appointment_id)
        if appointment.patient_id!=data.patient_id or appointment.provider_id!=data.provider_id: raise HTTPException(422,'Appointment does not match patient and provider')
        if appointment.status in ('cancelled','missed'): raise HTTPException(409,'Appointment is inactive')
    row=m.Encounter(**data.model_dump(),facility_id=c.facility_id,author_id=c.user.id)
    c.db.add(row); c.audit('create_encounter',row)
    return encounter_out(c.db,row)


@router.delete('/encounters/{identifier}')
def delete_encounter(identifier:str,c=Depends(context)):
    c.allow({'doctor','admin'})
    row=c.record(m.Encounter,identifier)
    if row.status=='signed': raise HTTPException(400,'Signed encounters cannot be deleted')
    c.db.execute(delete(m.Symptom).where(m.Symptom.encounter_id==row.id))
    c.db.execute(delete(m.NoteRevision).where(m.NoteRevision.encounter_id==row.id))
    c.db.execute(delete(m.CarryForward).where(m.CarryForward.encounter_id==row.id))
    c.db.execute(delete(m.Amendment).where(m.Amendment.encounter_id==row.id))
    c.db.delete(row)
    c.audit('delete_encounter',row)
    return {'status':'deleted'}


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
    cc = (row.chief_complaint or row.consult_notes or '').strip()
    ass = (row.assessment or row.physician_notes or row.consult_notes or '').strip()
    pl = (row.plan or row.treatment_notes or row.follow_up or row.consult_notes or '').strip()
    if not all([cc, ass, pl]): raise HTTPException(422,'Clinical notes/complaint, assessment, and plan are required to sign')
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
    row.result=data.result; row.status=data.status or 'Completed'; row.version+=1
    c.db.execute(delete(m.LabValue).where(m.LabValue.order_id==row.id))
    allowed_fields = {'test_name','parameter','value','unit','reference_range','interpretation','comments'}
    for value in data.values:
        clean = {k: str(v) for k, v in value.items() if k in allowed_fields and v is not None}
        if not {'parameter','value'}<=clean.keys() or any(len(str(v))>2000 for v in clean.values()): raise HTTPException(422,'Invalid structured result')
        c.db.add(m.LabValue(order_id=row.id,**clean))
    c.audit('record_result',row)
    return serialize(row)


@router.post('/orders/{identifier}/review')
def review(identifier:str,data:dict,c=Depends(context)):
    c.allow({'doctor'}); row=c.record(m.ClinicalOrder,identifier)
    if 'version' in data and data['version'] is not None:
        check_version(row,data['version'])
    if row.status not in ('resulted','Completed','Partial','Pending','reviewed'): raise HTTPException(409,'Only a resulted order can be reviewed')
    row.status='reviewed'; row.reviewed_by=c.user.id; row.reviewed_at=m.now(); row.version+=1
    if 'notes_lab_patient' in data and data['notes_lab_patient'] is not None:
        row.notes_lab_patient = data['notes_lab_patient']
    if 'notes_intra_office' in data and data['notes_intra_office'] is not None:
        row.notes_intra_office = data['notes_intra_office']
    c.audit('review_result',row)
    return serialize(row)


@router.put('/records/{kind}/{identifier}')
def update_record(kind:str,identifier:str,data:dict,c=Depends(context)):
    if kind not in RECORDS: raise HTTPException(404,'Unknown record type')
    c.allow(WRITE_ROLES[kind]); row=c.record(RECORDS[kind],identifier)
    if 'version' in data and data['version'] is not None:
        check_version(row,data['version'])
    if kind=='orders':
        allowed = {'name','instructions','status','ordered_date','notes_lab_patient','notes_intra_office','order_metadata','result','lab_ref'}
        for k in allowed:
            if k in data and data[k] is not None:
                setattr(row,k,data[k])
    elif kind=='diagnoses':
        allowed = {'code','description','onset','status'}
        for k in allowed:
            if k in data and data[k] is not None:
                setattr(row,k,data[k])
    else:
        for k, v in data.items():
            if k not in ('id','version','facility_id','author_id','created_at','updated_at') and hasattr(row,k):
                setattr(row,k,v)
    row.version+=1; c.audit('update_'+kind,row)
    return serialize(row)


@router.delete('/records/{kind}/{identifier}')
def delete_record(kind:str,identifier:str,c=Depends(context)):
    if kind not in RECORDS: raise HTTPException(404,'Unknown record type')
    c.allow(WRITE_ROLES[kind]); row=c.record(RECORDS[kind],identifier)
    if kind=='orders':
        c.db.execute(delete(m.LabValue).where(m.LabValue.order_id==row.id))
        c.db.execute(delete(m.Document).where(m.Document.order_id==row.id))
    c.db.delete(row); c.audit('delete_'+kind,row)
    return {'status':'deleted','id':identifier}


@router.delete('/documents/{identifier}')
def delete_document(identifier:str,c=Depends(context)):
    c.allow(CLINICAL); row=c.record(m.Document,identifier)
    c.db.delete(row); c.audit('delete_document',row)
    return {'status':'deleted','id':identifier}


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

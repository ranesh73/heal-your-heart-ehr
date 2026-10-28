from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, func, delete
from . import models as m, schemas as s
from .security import context, CLINICAL, BILLING, check_version, next_number
from .serialization import serialize, patient_out, encounter_out, invoice_out, plan_out

router=APIRouter(prefix='/api/patients')


@router.get('')
def patients(q:str='',offset:int=0,limit:int=100,c=Depends(context)):
    if len(q)>100 or offset<0 or not 1<=limit<=200: raise HTTPException(422,'Invalid search or page')
    query=select(m.Patient).join(m.PatientFacility).where(m.PatientFacility.facility_id==c.facility_id)
    if q:
        pattern='%'+q.replace('%','\\%').replace('_','\\_')+'%'
        query=query.where(or_(m.Patient.first_name.ilike(pattern,escape='\\'),m.Patient.last_name.ilike(pattern,escape='\\'),
            (m.Patient.first_name+' '+m.Patient.last_name).ilike(pattern,escape='\\'),m.Patient.mrn.ilike(pattern,escape='\\'),m.Patient.phone.ilike(pattern,escape='\\')))
    total=c.db.scalar(select(func.count()).select_from(query.subquery()))
    return {'total':total,'items':[patient_out(c.db,p) for p in c.db.scalars(query.order_by(m.Patient.first_name).offset(offset).limit(limit))]}


def validate_patient(data,c,existing=None):
    if c.facility_id not in data.facility_ids or any(x not in c.facility_ids for x in data.facility_ids):
        raise HTTPException(403,'Choose authorized branches including the current branch')
    if data.provider_id: c.staff(data.provider_id,{'doctor'})
    conditions=[(func.lower(m.Patient.first_name)==data.first_name.lower()) & (func.lower(m.Patient.last_name)==data.last_name.lower()) & (m.Patient.dob==data.dob)]
    if data.phone: conditions.append(m.Patient.phone==data.phone)
    duplicates=select(m.Patient).where(or_(*conditions))
    if existing: duplicates=duplicates.where(m.Patient.id!=existing.id)
    if c.db.scalar(duplicates) and len(data.duplicate_reason)<8:
        raise HTTPException(409,'Possible duplicate patient. Verify identity and enter a duplicate override reason (at least 8 characters).')


@router.post('')
def register(data:s.PatientInput,c=Depends(context)):
    c.allow({'reception','admin','doctor'}); validate_patient(data,c)
    branch=c.db.get(m.Facility,c.facility_id)
    values=data.model_dump(exclude={'facility_ids','duplicate_reason'})
    row=m.Patient(**values,primary_facility_id=c.facility_id,mrn=next_number(c.db,branch.code+'-MR'))
    c.db.add(row); c.db.flush()
    for fid in set(data.facility_ids): c.db.add(m.PatientFacility(patient_id=row.id,facility_id=fid))
    c.audit('register_patient',row,'Duplicate override recorded' if data.duplicate_reason else '')
    if data.duplicate_reason:
        c.db.add(m.PatientEntry(patient_id=row.id,facility_id=c.facility_id,author_id=c.user.id,kind='quick note',title='Duplicate review',content=data.duplicate_reason))
    return patient_out(c.db,row)


@router.put('/{identifier}')
def edit(identifier:str,data:s.PatientInput,version:int,c=Depends(context)):
    c.allow({'reception','admin','doctor'}); row=c.patient(identifier); check_version(row,version); validate_patient(data,c,row)
    previous=set(c.db.scalars(select(m.PatientFacility.facility_id).where(m.PatientFacility.patient_id==row.id)))
    if not previous.issubset(c.facility_ids): raise HTTPException(403,'Patient has branch associations outside your scope')
    if not previous.issubset(data.facility_ids): raise HTTPException(409,'Existing branch associations are retained to preserve chart access')
    for k,v in data.model_dump(exclude={'facility_ids','duplicate_reason'}).items(): setattr(row,k,v)
    for fid in set(data.facility_ids)-previous: c.db.add(m.PatientFacility(patient_id=row.id,facility_id=fid))
    row.version+=1; c.audit('edit_demographics',row)
    return patient_out(c.db,row)


@router.get('/{identifier}')
def chart(identifier:str,c=Depends(context)):
    row=c.patient(identifier)
    result={'patient':patient_out(c.db,row),'scope':'Current branch'}
    def rows(model):
        return c.db.scalars(select(model).where(model.patient_id==row.id,model.facility_id==c.facility_id).order_by(model.created_at.desc())).all()
    result['appointments']=[serialize(x) for x in rows(m.Appointment)]
    result['tasks']=[serialize(x) for x in rows(m.Task) if x.assignee_id==c.user.id or c.user.role in {'doctor','admin','reception'}]
    if c.user.role in CLINICAL:
        for key,model in [('history',m.History),('diagnoses',m.Diagnosis),('allergies',m.Allergy),('medications',m.Medication),('vitals',m.Vital),('orders',m.ClinicalOrder),('documents',m.Document),('sessions',m.DailySession),('weekly',m.WeeklyAssessment),('entries',m.PatientEntry)]:
            result[key]=[serialize(x) for x in rows(model)]
        result['encounters']=[encounter_out(c.db,x) for x in rows(m.Encounter)]
        result['plans']=[plan_out(c.db,x) for x in rows(m.Plan)]
        for order in result['orders']:
            order['values']=[serialize(x) for x in c.db.scalars(select(m.LabValue).where(m.LabValue.order_id==order['id']))]
    elif c.user.role=='reception':
        result['plans']=[{k:v for k,v in plan_out(c.db,x).items() if k in {'id','patient_id','program','session_count','completed','scheduled','status','therapist_id','start_date'}} for x in rows(m.Plan)]
    if c.user.role in BILLING:
        result['invoices']=[invoice_out(c.db,x) for x in rows(m.Invoice)]
    result['messages']=[serialize(x) for x in rows(m.Message) if c.user.id in (x.author_id,x.recipient_id)]
    c.audit('view_patient',row)
    return result

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from . import models as m, schemas as s
from .security import context, CLINICAL, check_version
from .serialization import serialize, plan_out

router=APIRouter(prefix='/api/eecp')


@router.get('/plans')
def plans(c=Depends(context)):
    c.allow(CLINICAL|{'reception'})
    rows=[plan_out(c.db,x) for x in c.db.scalars(select(m.Plan).where(m.Plan.facility_id==c.facility_id).order_by(m.Plan.created_at.desc()))]
    if c.user.role=='reception':
        return [{k:v for k,v in x.items() if k in ('id','patient_id','program','session_count','completed','scheduled','status','therapist_id','start_date')} for x in rows]
    return rows


@router.post('/plans')
def enroll(data:s.PlanInput,c=Depends(context)):
    c.allow({'doctor','therapist'}); c.patient(data.patient_id); c.staff(data.therapist_id,{'therapist'})
    row=m.Plan(**data.model_dump(),facility_id=c.facility_id,author_id=c.user.id); c.db.add(row); c.audit('enroll_eecp',row)
    return plan_out(c.db,row)


@router.post('/plans/{identifier}/authorize')
def authorize(identifier:str,data:s.Version,c=Depends(context)):
    c.allow({'doctor'}); row=c.record(m.Plan,identifier); check_version(row,data.version)
    if row.status!='draft': raise HTTPException(409,'Only draft plans can be authorized')
    row.authorized_by=c.user.id; row.authorized_at=m.now(); row.status='approved'; row.version+=1; c.audit('authorize_eecp',row)
    return plan_out(c.db,row)


@router.post('/plans/{identifier}/consent')
def consent(identifier:str,data:s.ConsentInput,c=Depends(context)):
    c.allow({'doctor','therapist'}); row=c.record(m.Plan,identifier); check_version(row,data.version)
    if row.status in ('completed','discontinued','cancelled'): raise HTTPException(409,'Plan is closed')
    doc=c.record(m.Document,data.document_id)
    if doc.patient_id!=row.patient_id: raise HTTPException(422,'Consent document belongs to another patient')
    row.consent_document_id=doc.id; row.consent_recorded_at=m.now(); row.consent_recorded_by=c.user.id; row.version+=1; c.audit('record_eecp_consent',row)
    return plan_out(c.db,row)


@router.post('/plans/{identifier}/status')
def status(identifier:str,data:s.StatusChange,c=Depends(context)):
    c.allow({'doctor'}); row=c.record(m.Plan,identifier); check_version(row,data.version)
    allowed={'draft':{'cancelled'},'approved':{'interrupted','discontinued','cancelled'},'active':{'interrupted','discontinued'},'interrupted':{'active','discontinued'}}
    if data.status not in allowed.get(row.status,set()): raise HTTPException(409,'Invalid plan status transition')
    if not data.reason: raise HTTPException(422,'A reason is required')
    running=c.db.scalar(select(m.DailySession).where(m.DailySession.plan_id==row.id,m.DailySession.status=='started'))
    if running: raise HTTPException(409,'Complete or interrupt the running session first')
    row.status=data.status; row.reason=data.reason; row.version+=1; c.audit('eecp_'+data.status,row)
    if data.status in ('discontinued','cancelled'):
        for a in c.db.scalars(select(m.Appointment).where(m.Appointment.plan_id==row.id,m.Appointment.status.in_(['confirmed','checked-in']))):
            a.status='cancelled'; a.status_label=None; a.reason=data.reason; a.version+=1
    return plan_out(c.db,row)


@router.get('/sessions')
def sessions(c=Depends(context)):
    c.allow(CLINICAL)
    return [serialize(x) for x in c.db.scalars(select(m.DailySession).where(m.DailySession.facility_id==c.facility_id).order_by(m.DailySession.created_at.desc()))]


@router.post('/appointments/{identifier}/start')
def start(identifier:str,data:s.Version,c=Depends(context)):
    c.allow({'therapist'}); appointment=c.record(m.Appointment,identifier); check_version(appointment,data.version)
    if not appointment.plan_id: raise HTTPException(422,'This is not an EECP appointment')
    plan=c.record(m.Plan,appointment.plan_id)
    if plan.status not in ('approved','active') or not plan.authorized_by or not plan.consent_document_id or not plan.consent_recorded_at:
        raise HTTPException(409,'An approved plan and recorded consent document are required')
    if appointment.provider_id!=c.user.id or plan.therapist_id!=c.user.id: raise HTTPException(403,'Session is not assigned to you')
    if appointment.status!='checked-in': raise HTTPException(409,'Check in the patient before starting treatment')
    existing=c.db.scalar(select(m.DailySession).where(m.DailySession.appointment_id==appointment.id))
    if existing: raise HTTPException(409,'Treatment already exists for this appointment')
    if c.db.scalar(select(m.DailySession).where(m.DailySession.status=='started',
        (m.DailySession.therapist_id==c.user.id)|(m.DailySession.resource_id==appointment.resource_id)|(m.DailySession.patient_id==appointment.patient_id))):
        raise HTTPException(409,'A session is already running for this patient, therapist, or bed')
    row=m.DailySession(patient_id=appointment.patient_id,facility_id=c.facility_id,author_id=c.user.id,plan_id=plan.id,
        appointment_id=appointment.id,therapist_id=c.user.id,resource_id=appointment.resource_id,session_number=appointment.session_number)
    c.db.add(row); appointment.status='started'; appointment.status_label=None; appointment.version+=1; plan.status='active'; plan.version+=1; c.audit('start_eecp_session',row)
    return serialize(row)


def editable_session(c,identifier,version):
    c.allow({'therapist'}); row=c.record(m.DailySession,identifier); check_version(row,version)
    if row.therapist_id!=c.user.id: raise HTTPException(403,'Session is assigned to another therapist')
    if row.status!='started': raise HTTPException(409,'Completed or interrupted session is immutable')
    return row


@router.put('/sessions/{identifier}')
def save_session(identifier:str,data:s.DailyInput,c=Depends(context)):
    row=editable_session(c,identifier,data.version)
    for k,v in data.model_dump(exclude={'version'}).items(): setattr(row,k,v)
    row.version+=1; c.audit('save_eecp_measurements',row)
    return serialize(row)


@router.post('/sessions/{identifier}/complete')
def complete_session(identifier:str,data:s.Version,c=Depends(context)):
    row=editable_session(c,identifier,data.version)
    if any(getattr(row,f['name']) is None for f in s.DAILY_FIELDS if f['required']): raise HTTPException(422,'Complete pre-session, 15-minute, and 45-minute measurements first')
    row.status='completed'; row.completed_at=m.now(); row.version+=1
    appointment=c.record(m.Appointment,row.appointment_id); appointment.status='completed'; appointment.status_label=None; appointment.version+=1
    plan=c.record(m.Plan,row.plan_id); c.db.flush()
    count=c.db.scalar(select(func.count()).select_from(m.DailySession).where(m.DailySession.plan_id==plan.id,m.DailySession.status=='completed'))
    if count==plan.session_count: plan.status='completed'
    plan.version+=1; c.audit('complete_eecp_session',row)
    return {'session':serialize(row),'plan':plan_out(c.db,plan),'weekly_due':count%7==0}


@router.post('/sessions/{identifier}/interrupt')
def interrupt(identifier:str,data:s.AmendmentInput,c=Depends(context)):
    c.allow({'therapist'}); row=c.record(m.DailySession,identifier)
    row=editable_session(c,identifier,row.version)
    row.status='interrupted'; row.observations+='\n'+data.reason+'\n'+data.content; row.version+=1
    a=c.record(m.Appointment,row.appointment_id); a.status='interrupted'; a.status_label=None; a.version+=1
    c.audit('interrupt_eecp_session',row)
    return serialize(row)


@router.post('/weekly/{identifier}/review')
def weekly_review(identifier:str,data:s.ReviewInput,c=Depends(context)):
    c.allow({'doctor'}); row=c.record(m.WeeklyAssessment,identifier); check_version(row,data.version)
    if row.reviewed_at: raise HTTPException(409,'Weekly assessment already reviewed')
    if not data.evaluation: raise HTTPException(422,'Physician evaluation is required')
    row.physician_evaluation=data.evaluation; row.physician_id=c.user.id; row.reviewed_at=m.now(); row.version+=1; c.audit('review_eecp_week',row)
    return serialize(row)

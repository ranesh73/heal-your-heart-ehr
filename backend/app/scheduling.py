from datetime import timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, func
from . import models as m, schemas as s
from .security import context, SCHEDULING, check_version
from .serialization import serialize

router=APIRouter(prefix='/api/appointments')
KOLKATA=ZoneInfo('Asia/Kolkata')
INACTIVE={'cancelled','missed'}


def utc(value):
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def check_slot(c,patient_id,provider_id,resource_id,start,end,exclude=None,plan=None):
    c.patient(patient_id); c.staff(provider_id,{'doctor','therapist'})
    if resource_id:
        resource=c.record(m.Resource,resource_id)
        if not resource.active: raise HTTPException(422,'Resource is inactive')
        if plan and resource.kind!='EECP bed': raise HTTPException(422,'EECP requires an EECP bed')
    if plan:
        if not resource_id: raise HTTPException(422,'EECP requires a bed')
        c.staff(provider_id,{'therapist'})
        if plan.status not in ('draft','approved','active'): raise HTTPException(409,'Treatment plan is not schedulable')
        if provider_id!=plan.therapist_id: raise HTTPException(422,'Use the therapist assigned to the plan')
        if (end-start).total_seconds()!=3600: raise HTTPException(422,'EECP appointments require 60 minutes')
        if start.replace(tzinfo=timezone.utc).astimezone(KOLKATA).date()<plan.start_date: raise HTTPException(422,'Appointment precedes plan start date')
    local=start.replace(tzinfo=timezone.utc).astimezone(KOLKATA)
    local_end=end.replace(tzinfo=timezone.utc).astimezone(KOLKATA)
    start_min=local.hour*60+local.minute
    end_min=local_end.hour*60+local_end.minute
    avail=c.db.scalars(select(m.Availability).where(m.Availability.user_id==provider_id,m.Availability.facility_id==c.facility_id,m.Availability.weekday==local.weekday())).all()
    if local.date()!=local_end.date() or not any(a.start_minute<=start_min and a.end_minute>=end_min for a in avail):
        raise HTTPException(409,'Provider is unavailable at this time')
    conflicts=select(m.Appointment).where(m.Appointment.start_at<end,m.Appointment.end_at>start,
        m.Appointment.status.not_in(INACTIVE),or_(m.Appointment.provider_id==provider_id,m.Appointment.patient_id==patient_id,
        m.Appointment.resource_id==resource_id if resource_id else False))
    if exclude: conflicts=conflicts.where(m.Appointment.id!=exclude)
    if c.db.scalar(conflicts): raise HTTPException(409,'Booking conflict: patient, provider, or bed is already reserved')


@router.get('')
def appointments(start:str|None=None,end:str|None=None,c=Depends(context)):
    query=select(m.Appointment).where(m.Appointment.facility_id==c.facility_id)
    if start and end:
        try:
            from datetime import datetime
            lower=utc(datetime.fromisoformat(start)); upper=utc(datetime.fromisoformat(end))
        except ValueError: raise HTTPException(422,'Invalid date range')
        query=query.where(m.Appointment.start_at>=lower,m.Appointment.start_at<upper)
    return [serialize(x) for x in c.db.scalars(query.order_by(m.Appointment.start_at).limit(1000))]


@router.post('')
def book(data:s.AppointmentInput,c=Depends(context)):
    c.allow(SCHEDULING); c.patient(data.patient_id)
    plan=c.record(m.Plan,data.plan_id) if data.plan_id else None
    if plan and plan.patient_id!=data.patient_id: raise HTTPException(422,'Plan and patient do not match')
    used=c.db.scalar(select(func.count()).select_from(m.Appointment).where(m.Appointment.plan_id==plan.id)) if plan else 0
    if plan and used+data.repeat_count>plan.session_count: raise HTTPException(409,'Booking exceeds plan session count')
    start=utc(data.start_at); series=str(uuid4()) if data.repeat_count>1 else None
    created=[]
    for index in range(data.repeat_count):
        if data.skip_sundays:
            while start.replace(tzinfo=timezone.utc).astimezone(KOLKATA).weekday()==6: start+=timedelta(days=1)
        end=start+timedelta(minutes=data.duration_minutes)
        check_slot(c,data.patient_id,data.provider_id,data.resource_id,start,end,plan=plan)
        row=m.Appointment(patient_id=data.patient_id,facility_id=c.facility_id,author_id=c.user.id,provider_id=data.provider_id,
            resource_id=data.resource_id,plan_id=data.plan_id,session_number=used+index+1 if plan else None,
            series_id=series,start_at=start,end_at=end,visit_type=data.visit_type,mode=data.mode,reason=data.reason)
        c.db.add(row); c.audit('book_appointment',row); created.append(serialize(row))
        start+=timedelta(days=data.interval_days)
    return created


@router.post('/{identifier}/status')
def status(identifier:str,data:s.StatusChange,c=Depends(context)):
    c.allow(SCHEDULING|{'assistant'}); row=c.record(m.Appointment,identifier); check_version(row,data.version)
    transitions={'confirmed':{'checked-in','cancelled','missed'},'checked-in':{'completed','cancelled','missed'}}
    if data.status not in transitions.get(row.status,set()): raise HTTPException(409,'Invalid appointment status transition')
    if row.plan_id and data.status=='completed': raise HTTPException(409,'Complete EECP through the daily treatment chart')
    if data.status in ('cancelled','missed') and not data.reason: raise HTTPException(422,'A reason is required')
    row.status=data.status; row.status_label=None; row.version+=1
    if data.status=='checked-in': row.checked_in_at=m.now()
    if data.reason: row.reason=data.reason
    c.audit('appointment_'+data.status,row)
    return serialize(row)


@router.post('/{identifier}/label')
def appointment_label(identifier:str,data:s.AppointmentLabelChange,c=Depends(context)):
    c.allow(SCHEDULING|{'assistant'}); row=c.record(m.Appointment,identifier); check_version(row,data.version)
    row.status_label=data.label; row.version+=1
    c.audit('appointment_label',row,data.label)
    return serialize(row)


@router.post('/{identifier}/reschedule')
def reschedule(identifier:str,data:s.Reschedule,c=Depends(context)):
    c.allow(SCHEDULING); row=c.record(m.Appointment,identifier); check_version(row,data.version)
    if row.status in ('started','completed'): raise HTTPException(409,'Started or completed treatment cannot be rescheduled')
    start=utc(data.start_at); end=start+timedelta(minutes=data.duration_minutes)
    plan=c.record(m.Plan,row.plan_id) if row.plan_id else None
    check_slot(c,row.patient_id,data.provider_id,data.resource_id,start,end,row.id,plan)
    old=row.start_at.isoformat()+'Z'
    row.start_at=start; row.end_at=end; row.provider_id=data.provider_id; row.resource_id=data.resource_id
    row.status='confirmed'; row.status_label=None; row.reason=data.reason; row.version+=1; row.checked_in_at=None
    c.audit('reschedule_appointment',row,'Previous start: '+old)
    return serialize(row)

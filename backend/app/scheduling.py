from datetime import timedelta, timezone
from typing import Optional
from uuid import uuid4
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from . import models as m, schemas as s
from .patient_alerts import active_alerts_for_patients
from .quick_notes import quick_notes_for_patients
from .security import context, SCHEDULING, check_version
from .serialization import serialize

router=APIRouter(prefix='/api/appointments')
KOLKATA=ZoneInfo('Asia/Kolkata')
INACTIVE={'cancelled','missed'}

FACILITIES_DATA = [
    {"code": "HYN", "name": "Heal Your Heart Neelankarai - HUH001", "address": "4/567, East Coast Road, Neelankarai, Chennai - 600041, Tamil Nadu", "phone": "+91 9003070065"},
    {"code": "HYR", "name": "Heal Your Heart Royapettah - HUH002", "address": "Royapettah, Chennai, Tamil Nadu", "phone": "+91 9789455491"},
    {"code": "4RH", "name": "4R Health & Wellness", "address": "Chennai, Tamil Nadu", "phone": "+91 9840123456"},
    {"code": "HYM", "name": "Heal Your Heart - Manapakkam - HUH003", "address": "Manapakkam, Chennai, Tamil Nadu", "phone": "+91 9840123457"},
    {"code": "HYD", "name": "Heal Your Heart-Madurai - 005", "address": "Madurai, Tamil Nadu", "phone": "+91 9840123458"},
    {"code": "HYT", "name": "Heal Your Heart-Tirunelveli - 004", "address": "Tirunelveli, Tamil Nadu", "phone": "+91 9840123459"},
]

ACTIVE_THERAPISTS_DATA = [
    {"name": "Divya A", "email": "divyadivya89412@gmail.com", "phone": ""},
    {"name": "Ellammal E", "email": "negashree94@gmail.com", "phone": ""},
    {"name": "Ilakkiya R", "email": "ilakkiya.r@healyourheart.local", "phone": "8807774037"},
    {"name": "Indumathi S", "email": "indumathi.s@healyourheart.local", "phone": "8754056792"},
    {"name": "Jagathishwari M", "email": "jagathishwari.m@healyourheart.local", "phone": ""},
    {"name": "Jamuna M", "email": "jamuna.m@healyourheart.local", "phone": "6380786758"},
    {"name": "Kalaiselvi T", "email": "kalaihuh@gmail.com", "phone": ""},
    {"name": "Mahalakshmi S", "email": "mahamathis06@gmail.com", "phone": ""},
    {"name": "Manikandan A", "email": "asokmani22@gmail.com", "phone": ""},
    {"name": "Maryshana J", "email": "maryshana238@gmail.com", "phone": ""},
    {"name": "Nathinila K", "email": "nilahuh2007@gmail.com", "phone": ""},
    {"name": "Niresha E", "email": "nireshajesus@gmail.com", "phone": ""},
    {"name": "Nirosha P", "email": "smileynirosha226@gmail.com", "phone": ""},
    {"name": "Parameswari R", "email": "pramusurya2009@gmail.com", "phone": ""},
    {"name": "Pavithra S", "email": "pavithra040708@gmail.com", "phone": ""},
    {"name": "Preethi A", "email": "preethianbarasu88@gmail.com", "phone": ""},
    {"name": "Priya K", "email": "priya.k@healyourheart.local", "phone": "9047407926"},
    {"name": "Priyadharshini T", "email": "priyadharshini.t@healyourheart.local", "phone": "6379731878"},
    {"name": "Priyanka R", "email": "priyapriyanka21866@gmail.com", "phone": ""},
    {"name": "Rabini M", "email": "rabini.m@healyourheart.local", "phone": "9360195524"},
    {"name": "Rajeswari S", "email": "rajeswarihuh@gmail.com", "phone": ""},
    {"name": "Serina S", "email": "sathiyaselansathi277@gmail.com", "phone": ""},
    {"name": "Sivasakthi M", "email": "sivasakthihuh@gmail.com", "phone": ""},
    {"name": "Sowntharya B", "email": "sowntharya25032008@gmail.com", "phone": ""},
    {"name": "Srilekha P", "email": "srilekhapcpt2021l@gmail.com", "phone": ""},
    {"name": "Uma R", "email": "uma844287@gmail.com", "phone": ""},
    {"name": "Vanitha M", "email": "vanitha.m@healyourheart.local", "phone": "7397405120"},
    {"name": "Vijaya Lakshmi V", "email": "saranyagovindan55@gmail.com", "phone": ""},
    {"name": "Vijayalakshmi K", "email": "vijayalakshmi.k@healyourheart.local", "phone": "9790967341"},
]

INACTIVE_THERAPISTS_DATA = [
    {"name": "Aruna A", "email": "aruna.a@healyourheart.local", "phone": ""},
    {"name": "Gayathri Kasinathan", "email": "gayathri.k@healyourheart.local", "phone": ""},
    {"name": "Selvarani K", "email": "selvarani.k@healyourheart.local", "phone": ""},
    {"name": "Sivaranjani S", "email": "sivaranjani.s@healyourheart.local", "phone": ""},
    {"name": "Uma S", "email": "uma.s@healyourheart.local", "phone": ""},
]


def ensure_eecp_scheduling_seed_data(db: Session):
    from .security import password_hash
    default_pw_hash = password_hash("therapist123")

    # 1. Facilities
    facilities_map = {}
    for f_info in FACILITIES_DATA:
        fac = db.scalar(select(m.Facility).where(m.Facility.code == f_info["code"]))
        if not fac:
            fac = m.Facility(
                id=str(uuid4()),
                code=f_info["code"],
                name=f_info["name"],
                address=f_info["address"],
                phone=f_info["phone"],
                active=True
            )
            db.add(fac)
            db.flush()
        else:
            if fac.name != f_info["name"]:
                fac.name = f_info["name"]
        facilities_map[f_info["code"]] = fac

    all_facilities = list(facilities_map.values())

    # 2. Resources for each facility (EECP Room 01 through 13 + Consultation room)
    for fac in all_facilities:
        existing_resources = {r.name: r for r in db.scalars(select(m.Resource).where(m.Resource.facility_id == fac.id))}
        for i in range(1, 14):
            room_name = f"EECP Room {i:02d}"
            if room_name not in existing_resources:
                db.add(m.Resource(
                    id=str(uuid4()),
                    facility_id=fac.id,
                    name=room_name,
                    kind="EECP bed",
                    active=True
                ))
        if "Consultation room" not in existing_resources:
            db.add(m.Resource(
                id=str(uuid4()),
                facility_id=fac.id,
                name="Consultation room",
                kind="Consultation room",
                active=True
            ))
    db.flush()

    # 3. Active Therapists
    for t_info in ACTIVE_THERAPISTS_DATA:
        user = db.scalar(select(m.User).where(or_(m.User.email == t_info["email"], m.User.name == t_info["name"])))
        if not user:
            user = m.User(
                id=str(uuid4()),
                name=t_info["name"],
                email=t_info["email"],
                role="therapist",
                title="Therapist",
                phone=t_info["phone"] or None,
                password_hash=default_pw_hash,
                active=True
            )
            db.add(user)
            db.flush()
        else:
            user.role = "therapist"
            user.title = "Therapist"
            user.active = True
            if t_info["phone"] and not user.phone:
                user.phone = t_info["phone"]

        # Ensure user facilities & availability (7:00 AM - 9:00 PM: 420 to 1260)
        for fac in all_facilities:
            uf = db.get(m.UserFacility, (user.id, fac.id))
            if not uf:
                db.add(m.UserFacility(user_id=user.id, facility_id=fac.id))

            existing_avail = set(db.scalars(select(m.Availability.weekday).where(
                m.Availability.user_id == user.id,
                m.Availability.facility_id == fac.id
            )))
            for w in range(7):
                if w not in existing_avail:
                    db.add(m.Availability(
                        id=str(uuid4()),
                        facility_id=fac.id,
                        user_id=user.id,
                        weekday=w,
                        start_minute=420,
                        end_minute=1260
                    ))

    # 4. Inactive Therapists (must NEVER appear in booking dropdowns)
    for it_info in INACTIVE_THERAPISTS_DATA:
        user = db.scalar(select(m.User).where(or_(m.User.email == it_info["email"], m.User.name == it_info["name"])))
        if not user:
            user = m.User(
                id=str(uuid4()),
                name=it_info["name"],
                email=it_info["email"],
                role="therapist",
                title="Therapist",
                phone=it_info["phone"] or None,
                password_hash=default_pw_hash,
                active=False
            )
            db.add(user)
        else:
            user.active = False
            user.role = "therapist"
            user.title = "Therapist"

    db.commit()


def utc(value):
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def check_slot(c,patient_id,provider_id,resource_id,start,end,exclude=None,plan=None,allow_overlap=False,allow_outside_hours=False):
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
    if not allow_outside_hours:
        avail=c.db.scalars(select(m.Availability).where(m.Availability.user_id==provider_id,m.Availability.facility_id==c.facility_id,m.Availability.weekday==local.weekday())).all()
        if local.date()!=local_end.date() or not any(a.start_minute<=start_min and a.end_minute>=end_min for a in avail):
            raise HTTPException(409,'Provider is unavailable at this time')
    if allow_overlap:
        conflict_clauses = [m.Appointment.patient_id == patient_id]
        if resource_id:
            conflict_clauses.append(m.Appointment.resource_id == resource_id)
        conflicts = select(m.Appointment).where(
            m.Appointment.start_at < end,
            m.Appointment.end_at > start,
            m.Appointment.status.not_in(INACTIVE),
            or_(*conflict_clauses)
        )
    else:
        conflicts = select(m.Appointment).where(
            m.Appointment.start_at < end,
            m.Appointment.end_at > start,
            m.Appointment.status.not_in(INACTIVE),
            or_(
                m.Appointment.provider_id == provider_id,
                m.Appointment.patient_id == patient_id,
                m.Appointment.resource_id == resource_id if resource_id else False
            )
        )
    if exclude: conflicts=conflicts.where(m.Appointment.id!=exclude)
    if c.db.scalar(conflicts): raise HTTPException(409,'Booking conflict: patient, provider, or bed is already reserved')


@router.get('/available-therapists')
def get_available_therapists(
    date: str,
    start_time: str,
    duration: int = 60,
    facility: Optional[str] = None,
    exclude_appointment_id: Optional[str] = None,
    c=Depends(context)
):
    import re
    from datetime import datetime, time

    target_facility_id = facility or c.facility_id

    # 1. Parse date
    try:
        dt_date = datetime.strptime(date.strip()[:10], '%Y-%m-%d').date()
    except Exception:
        raise HTTPException(422, 'Invalid date format, expected YYYY-MM-DD')

    # 2. Parse start_time
    st_clean = start_time.strip()
    if 'T' in st_clean:
        dt_start_local = datetime.fromisoformat(st_clean)
        if dt_start_local.tzinfo is None:
            dt_start_local = dt_start_local.replace(tzinfo=KOLKATA)
        else:
            dt_start_local = dt_start_local.astimezone(KOLKATA)
    else:
        m_ampm = re.match(r'^(\d{1,2}):(\d{2})\s*(AM|PM)?$', st_clean, re.IGNORECASE)
        if m_ampm:
            hr = int(m_ampm.group(1))
            mn = int(m_ampm.group(2))
            ampm = (m_ampm.group(3) or '').upper()
            if ampm == 'PM' and hr < 12:
                hr += 12
            elif ampm == 'AM' and hr == 12:
                hr = 0
            t_obj = time(hr, mn)
        else:
            parsed_time = None
            for fmt in ('%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M%p'):
                try:
                    parsed_time = datetime.strptime(st_clean, fmt).time()
                    break
                except ValueError:
                    pass
            if not parsed_time:
                raise HTTPException(422, f'Invalid start_time: {start_time}')
            t_obj = parsed_time
        dt_start_local = datetime.combine(dt_date, t_obj, tzinfo=KOLKATA)

    dt_end_local = dt_start_local + timedelta(minutes=int(duration))
    start_utc = dt_start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = dt_end_local.astimezone(timezone.utc).replace(tzinfo=None)

    # 3. Query all ACTIVE therapists associated with target facility
    active_therapists = list(c.db.scalars(
        select(m.User)
        .join(m.UserFacility, m.UserFacility.user_id == m.User.id)
        .where(
            m.UserFacility.facility_id == target_facility_id,
            m.User.role == 'therapist',
            m.User.active == True
        )
        .order_by(m.User.name)
    ))
    if not active_therapists:
        active_therapists = list(c.db.scalars(
            select(m.User)
            .where(m.User.role == 'therapist', m.User.active == True)
            .order_by(m.User.name)
        ))

    therapist_ids = {t.id for t in active_therapists}

    # 4. Check appointment conflicts for therapists and resources
    conflict_query = select(m.Appointment).where(
        m.Appointment.start_at < end_utc,
        m.Appointment.end_at > start_utc,
        m.Appointment.status.not_in(INACTIVE)
    )
    if exclude_appointment_id:
        conflict_query = conflict_query.where(m.Appointment.id != exclude_appointment_id)

    overlapping_appts = list(c.db.scalars(conflict_query))

    busy_therapist_map = {}
    busy_resource_map = {}

    for a in overlapping_appts:
        pat = c.db.get(m.Patient, a.patient_id)
        pat_name = f"{pat.first_name} {pat.last_name}" if pat else "Patient"
        s_str = a.start_at.replace(tzinfo=timezone.utc).astimezone(KOLKATA).strftime('%I:%M %p').lstrip('0')
        e_str = a.end_at.replace(tzinfo=timezone.utc).astimezone(KOLKATA).strftime('%I:%M %p').lstrip('0')
        occ_time = f"{s_str} - {e_str}"

        if a.provider_id and a.provider_id in therapist_ids:
            busy_therapist_map[a.provider_id] = {
                "occupied_time": occ_time,
                "patient_name": pat_name,
                "reason": a.reason or a.visit_type or "Booked"
            }
        if a.resource_id:
            busy_resource_map[a.resource_id] = {
                "occupied_time": occ_time,
                "patient_name": pat_name,
            }

    available_therapists_list = [
        {"id": t.id, "name": t.name, "email": t.email, "phone": t.phone, "available": True}
        for t in active_therapists
        if t.id not in busy_therapist_map
    ]

    busy_therapists_list = [
        {"id": t.id, "name": t.name, "email": t.email, "phone": t.phone, "available": False, **busy_therapist_map[t.id]}
        for t in active_therapists
        if t.id in busy_therapist_map
    ]

    facility_resources = list(c.db.scalars(
        select(m.Resource).where(m.Resource.facility_id == target_facility_id, m.Resource.active == True)
    ))
    rooms_data = []
    for r in facility_resources:
        is_occ = r.id in busy_resource_map
        rooms_data.append({
            "id": r.id,
            "name": r.name,
            "kind": r.kind,
            "available": not is_occ,
            "occupied_time": busy_resource_map.get(r.id, {}).get("occupied_time") if is_occ else None,
            "patient_name": busy_resource_map.get(r.id, {}).get("patient_name") if is_occ else None,
        })
    rooms_data.sort(key=lambda x: x["name"])

    start_display = dt_start_local.strftime('%I:%M %p').lstrip('0')
    end_display = dt_end_local.strftime('%I:%M %p').lstrip('0')

    return {
        "date": dt_date.isoformat(),
        "start_time": start_display,
        "end_time": end_display,
        "duration": duration,
        "facility_id": target_facility_id,
        "available_count": len(available_therapists_list),
        "total_active_count": len(active_therapists),
        "therapists": available_therapists_list,
        "busy_therapists": busy_therapists_list,
        "rooms": rooms_data
    }


@router.get('')
def appointments(start:str|None=None,end:str|None=None,c=Depends(context)):
    query=select(m.Appointment).where(m.Appointment.facility_id==c.facility_id)
    if start and end:
        try:
            from datetime import datetime
            lower=utc(datetime.fromisoformat(start)); upper=utc(datetime.fromisoformat(end))
        except ValueError: raise HTTPException(422,'Invalid date range')
        query=query.where(m.Appointment.start_at>=lower,m.Appointment.start_at<upper)
    appts = list(c.db.scalars(query.order_by(m.Appointment.start_at).limit(1000)))
    patient_ids = [a.patient_id for a in appts]
    alerts_map = active_alerts_for_patients(c.db, patient_ids)
    notes_map = quick_notes_for_patients(c.db, patient_ids)
    items = []
    for x in appts:
        row = serialize(x)
        row['active_alerts'] = alerts_map.get(x.patient_id, [])
        row['quick_notes'] = notes_map.get(x.patient_id, [])
        items.append(row)
    return items


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
        check_slot(c,data.patient_id,data.provider_id,data.resource_id,start,end,plan=plan,allow_overlap=data.allow_overlap,allow_outside_hours=data.allow_outside_hours)
        row=m.Appointment(patient_id=data.patient_id,facility_id=c.facility_id,author_id=c.user.id,provider_id=data.provider_id,
            resource_id=data.resource_id,plan_id=data.plan_id,session_number=used+index+1 if plan else None,
            series_id=series,start_at=start,end_at=end,visit_type=data.visit_type,mode=data.mode,reason=data.reason)
        c.db.add(row); c.audit('book_appointment',row); created.append(serialize(row))
        start+=timedelta(days=data.interval_days)
    return created


def check_appointment_checkout_gate(
    db: Session,
    appointment: m.Appointment,
    user: m.User,
    facility_id: str,
    reason: Optional[str] = None
) -> None:
    """Verifies that no required workflow steps remain open before completing appointment."""
    instance = db.scalar(
        select(m.WorkflowInstance).where(
            m.WorkflowInstance.appointment_id == appointment.id,
            m.WorkflowInstance.facility_id == facility_id
        )
    )
    if not instance:
        return

    open_steps = db.scalars(
        select(m.WorkflowStep).where(
            m.WorkflowStep.instance_id == instance.id,
            m.WorkflowStep.required == True,
            m.WorkflowStep.status.notin_(['completed', 'skipped'])
        )
    ).all()
    if not open_steps:
        return

    open_keys = [s.step_key for s in open_steps]
    if user.role in ('admin', 'doctor') and reason and reason.strip():
        reason_clean = reason.strip()
        db.add(m.WorkflowEvent(
            instance_id=instance.id,
            step_id=None,
            event_type="checkout_override",
            actor_id=user.id,
            actor_type="user",
            timestamp=m.now()
        ))
        db.add(m.AuditEvent(
            facility_id=facility_id,
            actor_id=user.id,
            action="workflow_checkout_override",
            entity_type="appointments",
            entity_id=appointment.id,
            detail=f"Checkout override by {user.role}: {reason_clean}; Open steps: {', '.join(open_keys)}"
        ))
    else:
        role_msg = " Written override reason required from doctor or admin." if user.role in ('admin', 'doctor') else " Only doctors or administrators may override."
        raise HTTPException(
            409,
            f"Cannot complete appointment: workflow has open required steps: {', '.join(open_keys)}.{role_msg}"
        )


@router.post('/{identifier}/status')
def status(identifier:str,data:s.StatusChange,c=Depends(context)):
    c.allow(SCHEDULING|{'assistant'}); row=c.record(m.Appointment,identifier); check_version(row,data.version)
    transitions={'confirmed':{'checked-in','cancelled','missed'},'checked-in':{'completed','cancelled','missed'}}
    if data.status not in transitions.get(row.status,set()): raise HTTPException(409,'Invalid appointment status transition')
    if row.plan_id and data.status=='completed': raise HTTPException(409,'Complete EECP through the daily treatment chart')
    if data.status in ('cancelled','missed') and not data.reason: raise HTTPException(422,'A reason is required')

    # CHECKOUT GATE: Verify no required workflow steps remain open for this appointment
    if data.status == 'completed':
        check_appointment_checkout_gate(c.db, row, c.user, c.facility_id, data.reason)

    previous_status = row.status
    row.status=data.status; row.status_label=None; row.version+=1
    if data.status=='checked-in': row.checked_in_at=m.now()
    if data.reason: row.reason=data.reason
    c.audit('appointment_'+data.status,row)
    if data.status == 'checked-in' and previous_status != 'checked-in':
        try:
            from .workflow_engine import WorkflowEngine
            WorkflowEngine().trigger_patient_arrival(
                db=c.db,
                facility_id=c.facility_id,
                appointment_id=row.id,
                actor_id=c.user.id
            )
        except Exception as e:
            import logging
            logging.getLogger('ehr').warning('Patient arrival workflow trigger error: %s', e)
    return serialize(row)


@router.post('/{identifier}/label')
def appointment_label(identifier:str,data:s.AppointmentLabelChange,c=Depends(context)):
    c.allow(SCHEDULING|{'assistant'}); row=c.record(m.Appointment,identifier); check_version(row,data.version)
    row.status_label=data.label; row.version+=1
    c.audit('appointment_label',row,data.label)
    return serialize(row)


@router.patch('/{identifier}')
@router.put('/{identifier}')
def update_appointment(identifier:str, data:s.AppointmentPatch, c=Depends(context)):
    c.allow(SCHEDULING|{'assistant'}); row=c.record(m.Appointment,identifier)
    previous_status = row.status
    if data.resource_id is not None:
        row.resource_id = data.resource_id if data.resource_id else None
    if data.token_number is not None:
        row.token_number = data.token_number
    if data.status is not None:
        if data.status == 'completed':
            check_appointment_checkout_gate(c.db, row, c.user, c.facility_id)
        row.status = data.status
        if data.status == 'checked-in' and not row.checked_in_at:
            row.checked_in_at = m.now()
    if data.status_label is not None:
        row.status_label = data.status_label
    if data.checked_in_at is not None:
        row.checked_in_at = data.checked_in_at
    row.version += 1
    c.audit('update_appointment', row)
    if data.status == 'checked-in' and previous_status != 'checked-in':
        try:
            from .workflow_engine import WorkflowEngine
            WorkflowEngine().trigger_patient_arrival(
                db=c.db,
                facility_id=c.facility_id,
                appointment_id=row.id,
                actor_id=c.user.id
            )
        except Exception as e:
            import logging
            logging.getLogger('ehr').warning('Patient arrival workflow trigger error: %s', e)
    return serialize(row)


@router.post('/{identifier}/token')
def generate_token(identifier:str, c=Depends(context)):
    c.allow(SCHEDULING|{'assistant'}); row=c.record(m.Appointment,identifier)
    if not row.token_number:
        day_start = row.start_at.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = row.start_at.replace(hour=23, minute=59, second=59, microsecond=999999)
        max_token = c.db.scalar(
            select(func.max(m.Appointment.token_number)).where(
                m.Appointment.facility_id == c.facility_id,
                m.Appointment.start_at >= day_start,
                m.Appointment.start_at <= day_end
            )
        ) or 0
        row.token_number = max_token + 1
        row.version += 1
        c.audit('generate_token', row, f"Token #{row.token_number}")
    return serialize(row)


@router.post('/{identifier}/reschedule')
def reschedule(identifier:str,data:s.Reschedule,c=Depends(context)):
    c.allow(SCHEDULING); row=c.record(m.Appointment,identifier); check_version(row,data.version)
    if row.status in ('started','completed'): raise HTTPException(409,'Started or completed treatment cannot be rescheduled')
    start=utc(data.start_at); end=start+timedelta(minutes=data.duration_minutes)
    plan=c.record(m.Plan,row.plan_id) if row.plan_id else None
    check_slot(c,row.patient_id,data.provider_id,data.resource_id,start,end,row.id,plan,allow_overlap=data.allow_overlap,allow_outside_hours=data.allow_outside_hours)
    old=row.start_at.isoformat()+'Z'
    row.start_at=start; row.end_at=end; row.provider_id=data.provider_id; row.resource_id=data.resource_id
    row.status='confirmed'; row.status_label=None; row.reason=data.reason; row.version+=1; row.checked_in_at=None
    c.audit('reschedule_appointment',row,'Previous start: '+old)
    return serialize(row)

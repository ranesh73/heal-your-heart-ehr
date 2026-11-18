"""Patient Recalls & Settings -> Patient Recall (Types, Statuses, Preferences, Follow-up Templates)."""
import calendar
from datetime import date, datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from . import models as m
from .security import context


router = APIRouter(prefix='/api')
ALL_STAFF = {'admin', 'doctor', 'assistant', 'therapist', 'reception', 'billing'}
IST = timezone(timedelta(hours=5, minutes=30))

DEFAULT_SMS_TEMPLATE = 'Reminder from $PRACTICE to schedule for $NOTES. Please ignore, if already scheduled'

DEFAULT_RECALL_TYPES = [
    'Reassessment visit',
    'Non EECP Reassessment Visit',
    'Procedures',
    'Lab test',
    'Admission',
    'No show',
]

DEFAULT_RECALL_STATUSES = [
    ('Pending', True),
    ('Completed', True),
    ('Not willing', False),
    ('Do not disturb', False),
    ('Bypass Surgery', False),
    ('Alternate medicine', False),
    ('Expired', False),
    ('Postponed Appointment', False),
    ('Patient Discontinued', False),
    ('Treatment Started', False),
    ('PTCA', False),
    ('Waitlisted', False),
    ('Willing to start', False),
    ('Received', False),
]

DEFAULT_VASO_TEMPLATE_ITEMS = [
    {
        'recall_type_name': 'Reassessment visit',
        'notes': 'Please bring the advised lab reports taken just before the follow-up visit.',
        'date_direction': 'after',
        'interval_value': 3,
        'interval_unit': 'months',
        'email_enabled': True,
        'email_days_before': 3,
        'sms_enabled': True,
        'sms_days_before': 3,
    }
]


# --- Pydantic Schemas ---
class RecallTypeInput(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    display_order: int | None = None


class RecallStatusInput(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    display_order: int | None = None


class RecallPreferencesUpdate(BaseModel):
    default_email_enabled: bool = True
    default_sms_enabled: bool = True
    email_days_before: int = Field(default=3, ge=0, le=365)
    sms_days_before: int = Field(default=3, ge=0, le=365)
    sms_template_text: str = Field(default=DEFAULT_SMS_TEMPLATE, min_length=1, max_length=2000)
    mark_complete_on_send: bool = True


class RecallTemplateItemSchema(BaseModel):
    recall_type_id: str | None = None
    recall_type_name: str = Field(default='Reassessment visit', max_length=150)
    notes: str = Field(default='', max_length=4000)
    date_direction: Literal['after', 'before'] = 'after'
    interval_value: int = Field(default=3, ge=0, le=3650)
    interval_unit: Literal['days', 'weeks', 'months'] = 'months'
    email_enabled: bool = True
    email_days_before: int = Field(default=3, ge=0, le=365)
    sms_enabled: bool = True
    sms_days_before: int = Field(default=3, ge=0, le=365)


class RecallTemplateCreate(BaseModel):
    category: Literal['PRACTICE', 'MY'] = 'MY'
    name: str = Field(min_length=1, max_length=150)
    items: list[RecallTemplateItemSchema] = Field(min_length=1, max_length=30)


class PatientRecallCreateItem(BaseModel):
    recall_type_id: str | None = None
    recall_type_name: str | None = None
    status_id: str | None = None
    provider_id: str | None = None
    notes: str = Field(default='', max_length=4000)
    due_date: date | None = None
    visit_date: date | None = None
    date_direction: Literal['after', 'before'] = 'after'
    interval_value: int | None = Field(default=None, ge=0, le=3650)
    interval_unit: Literal['days', 'weeks', 'months'] = 'weeks'
    auto_reminder_enabled: bool = True
    email_enabled: bool = True
    email_reminder_days: int | None = Field(default=3, ge=0, le=365)
    sms_enabled: bool = True
    sms_reminder_days: int | None = Field(default=3, ge=0, le=365)


class PatientRecallCreate(PatientRecallCreateItem):
    items: list[PatientRecallCreateItem] | None = None


class PatientRecallUpdate(BaseModel):
    recall_type_id: str | None = None
    status_id: str | None = None
    provider_id: str | None = None
    notes: str | None = Field(default=None, max_length=4000)
    due_date: date | None = None
    visit_date: date | None = None
    auto_reminder_enabled: bool | None = None
    email_reminder_days: int | None = Field(default=None, ge=0, le=365)
    sms_reminder_days: int | None = Field(default=None, ge=0, le=365)
    clear_email_reminder: bool = False
    clear_sms_reminder: bool = False
    mark_completed: bool = False


# --- Seeding ---
def ensure_recalls_seed_data(db):
    # 1. Seed 6 Recall Types
    for idx, name in enumerate(DEFAULT_RECALL_TYPES, start=1):
        existing = db.scalar(select(m.RecallType).where(func.lower(m.RecallType.name) == name.lower()))
        if not existing:
            db.add(
                m.RecallType(
                    id=str(uuid4()),
                    name=name,
                    display_order=idx,
                    is_active=True,
                    created_at=m.now(),
                    updated_at=m.now(),
                )
            )

    # 2. Seed 14 Recall Statuses (Pending & Completed locked as is_system_default=True)
    for idx, (name, is_default) in enumerate(DEFAULT_RECALL_STATUSES, start=1):
        existing = db.scalar(select(m.RecallStatus).where(func.lower(m.RecallStatus.name) == name.lower()))
        if not existing:
            db.add(
                m.RecallStatus(
                    id=str(uuid4()),
                    name=name,
                    is_system_default=is_default,
                    display_order=idx,
                    is_active=True,
                    created_at=m.now(),
                    updated_at=m.now(),
                )
            )
        elif is_default and not existing.is_system_default:
            existing.is_system_default = True

    # 3. Seed Default Recall Preferences (singleton id=1)
    pref = db.get(m.RecallPreference, 1)
    if not pref:
        db.add(
            m.RecallPreference(
                id=1,
                default_email_enabled=True,
                default_sms_enabled=True,
                email_days_before=3,
                sms_days_before=3,
                sms_template_text=DEFAULT_SMS_TEMPLATE,
                mark_complete_on_send=True,
                updated_at=m.now(),
            )
        )

    # 4. Seed Practice Follow-up Template: Vaso-Meditech Follow-up
    tmpl = db.scalar(
        select(m.RecallTemplate).where(
            m.RecallTemplate.category == 'PRACTICE',
            m.RecallTemplate.name == 'Vaso-Meditech Follow-up',
        )
    )
    if not tmpl:
        db.add(
            m.RecallTemplate(
                id=str(uuid4()),
                category='PRACTICE',
                name='Vaso-Meditech Follow-up',
                items_json=DEFAULT_VASO_TEMPLATE_ITEMS,
                created_by=None,
                created_at=m.now(),
                updated_at=m.now(),
            )
        )
    db.flush()


# --- Helpers ---
def _today_ist() -> date:
    return datetime.now(IST).date()


def _iso(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.isoformat() + 'Z'
    return dt.isoformat()


def _add_months(d: date, months: int) -> date:
    total = (d.year * 12 + (d.month - 1)) + months
    year = total // 12
    month = (total % 12) + 1
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(d.day, last_day))


def _compute_due_date(base: date, direction: str, value: int, unit: str) -> date:
    signed = value if direction == 'after' else -value
    if unit == 'days':
        return base + timedelta(days=signed)
    if unit == 'weeks':
        return base + timedelta(weeks=signed)
    if unit == 'months':
        return _add_months(base, signed)
    return base + timedelta(days=signed)


def _serialize_type(row: m.RecallType) -> dict:
    return {
        'id': row.id,
        'name': row.name,
        'display_order': row.display_order,
        'is_active': bool(row.is_active),
    }


def _serialize_status(row: m.RecallStatus) -> dict:
    return {
        'id': row.id,
        'name': row.name,
        'is_system_default': bool(row.is_system_default),
        'display_order': row.display_order,
        'is_active': bool(row.is_active),
    }


def _serialize_preferences(row: m.RecallPreference) -> dict:
    return {
        'id': row.id,
        'default_email_enabled': bool(row.default_email_enabled),
        'default_sms_enabled': bool(row.default_sms_enabled),
        'email_days_before': int(row.email_days_before),
        'sms_days_before': int(row.sms_days_before),
        'sms_template_text': row.sms_template_text or DEFAULT_SMS_TEMPLATE,
        'default_sms_template_text': DEFAULT_SMS_TEMPLATE,
        'mark_complete_on_send': bool(row.mark_complete_on_send),
        'updated_at': _iso(row.updated_at),
    }


def _serialize_template(row: m.RecallTemplate) -> dict:
    return {
        'id': row.id,
        'category': row.category,
        'name': row.name,
        'items': row.items_json or [],
        'created_by': row.created_by,
        'created_at': _iso(row.created_at),
    }


def _serialize_recalls(db, rows: list[m.PatientRecall]) -> list[dict]:
    if not rows:
        return []
    type_ids = {r.recall_type_id for r in rows}
    status_ids = {r.status_id for r in rows}
    provider_ids = {r.provider_id for r in rows}

    types_map = {t.id: t for t in db.scalars(select(m.RecallType).where(m.RecallType.id.in_(type_ids))).all()}
    statuses_map = {s.id: s for s in db.scalars(select(m.RecallStatus).where(m.RecallStatus.id.in_(status_ids))).all()}
    providers_map = {u.id: u for u in db.scalars(select(m.User).where(m.User.id.in_(provider_ids))).all()}

    out = []
    for r in rows:
        rt = types_map.get(r.recall_type_id)
        rs = statuses_map.get(r.status_id)
        prov = providers_map.get(r.provider_id)
        reminder_active = bool(
            r.auto_reminder_enabled and (r.email_reminder_days is not None or r.sms_reminder_days is not None)
        )
        out.append({
            'id': r.id,
            'facility_id': r.facility_id,
            'patient_id': r.patient_id,
            'recall_type_id': r.recall_type_id,
            'recall_type_name': rt.name if rt else '',
            'status_id': r.status_id,
            'status_name': rs.name if rs else 'Pending',
            'provider_id': r.provider_id,
            'provider_name': prov.name if prov else '',
            'notes': r.notes or '',
            'due_date': r.due_date.isoformat() if r.due_date else None,
            'visit_date': r.visit_date.isoformat() if r.visit_date else None,
            'auto_reminder_enabled': reminder_active,
            'auto_reminder_label': 'Enabled' if reminder_active else 'Not Enabled',
            'email_reminder_days': r.email_reminder_days,
            'sms_reminder_days': r.sms_reminder_days,
            'reminder_sent_at': _iso(r.reminder_sent_at),
            'created_at': _iso(r.created_at),
            'updated_at': _iso(r.updated_at),
        })
    return out


# ==============================================================================
# SETTINGS: RECALL TYPES
# ==============================================================================
@router.get('/settings/recall-types')
def list_recall_types(c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    rows = c.db.scalars(
        select(m.RecallType)
        .where(m.RecallType.is_active == True)  # noqa: E712
        .order_by(m.RecallType.display_order.asc(), m.RecallType.name.asc())
    ).all()
    return [_serialize_type(r) for r in rows]


@router.post('/settings/recall-types')
def create_recall_type(data: RecallTypeInput, c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    name = data.name.strip()
    existing = c.db.scalar(select(m.RecallType).where(func.lower(m.RecallType.name) == name.lower()))
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.name = name
            existing.updated_at = m.now()
            c.audit('restore_recall_type', existing, name)
            return _serialize_type(existing)
        raise HTTPException(409, f'Recall type "{name}" already exists.')
    max_order = c.db.scalar(select(func.coalesce(func.max(m.RecallType.display_order), 0))) or 0
    row = m.RecallType(
        id=str(uuid4()),
        name=name,
        display_order=data.display_order if data.display_order is not None else int(max_order) + 1,
        is_active=True,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_recall_type', row, name)
    return _serialize_type(row)


@router.put('/settings/recall-types/{type_id}')
def update_recall_type(type_id: str, data: RecallTypeInput, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.RecallType, type_id)
    if not row or not row.is_active:
        raise HTTPException(404, 'Recall type not found')
    name = data.name.strip()
    dup = c.db.scalar(
        select(m.RecallType).where(func.lower(m.RecallType.name) == name.lower(), m.RecallType.id != type_id)
    )
    if dup:
        raise HTTPException(409, f'Recall type "{name}" already exists.')
    row.name = name
    if data.display_order is not None:
        row.display_order = data.display_order
    row.updated_at = m.now()
    c.audit('update_recall_type', row, name)
    return _serialize_type(row)


@router.delete('/settings/recall-types/{type_id}')
def delete_recall_type(type_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.RecallType, type_id)
    if not row:
        raise HTTPException(404, 'Recall type not found')
    in_use = c.db.scalar(select(func.count(m.PatientRecall.id)).where(m.PatientRecall.recall_type_id == type_id)) or 0
    if in_use > 0:
        row.is_active = False
        row.updated_at = m.now()
    else:
        c.db.delete(row)
    c.audit('delete_recall_type', row, row.name)
    return {'deleted': True, 'id': type_id}


# ==============================================================================
# SETTINGS: RECALL STATUSES
# ==============================================================================
@router.get('/settings/recall-statuses')
def list_recall_statuses(c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    rows = c.db.scalars(
        select(m.RecallStatus)
        .where(m.RecallStatus.is_active == True)  # noqa: E712
        .order_by(m.RecallStatus.display_order.asc(), m.RecallStatus.name.asc())
    ).all()
    return [_serialize_status(r) for r in rows]


@router.post('/settings/recall-statuses')
def create_recall_status(data: RecallStatusInput, c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    name = data.name.strip()
    existing = c.db.scalar(select(m.RecallStatus).where(func.lower(m.RecallStatus.name) == name.lower()))
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.name = name
            existing.updated_at = m.now()
            c.audit('restore_recall_status', existing, name)
            return _serialize_status(existing)
        raise HTTPException(409, f'Recall status "{name}" already exists.')
    max_order = c.db.scalar(select(func.coalesce(func.max(m.RecallStatus.display_order), 0))) or 0
    row = m.RecallStatus(
        id=str(uuid4()),
        name=name,
        is_system_default=False,
        display_order=data.display_order if data.display_order is not None else int(max_order) + 1,
        is_active=True,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_recall_status', row, name)
    return _serialize_status(row)


@router.put('/settings/recall-statuses/{status_id}')
def update_recall_status(status_id: str, data: RecallStatusInput, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.RecallStatus, status_id)
    if not row or not row.is_active:
        raise HTTPException(404, 'Recall status not found')
    if row.is_system_default:
        raise HTTPException(400, 'Default status cannot be edited')
    name = data.name.strip()
    dup = c.db.scalar(
        select(m.RecallStatus).where(func.lower(m.RecallStatus.name) == name.lower(), m.RecallStatus.id != status_id)
    )
    if dup:
        raise HTTPException(409, f'Recall status "{name}" already exists.')
    row.name = name
    if data.display_order is not None:
        row.display_order = data.display_order
    row.updated_at = m.now()
    c.audit('update_recall_status', row, name)
    return _serialize_status(row)


@router.delete('/settings/recall-statuses/{status_id}')
def delete_recall_status(status_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.RecallStatus, status_id)
    if not row:
        raise HTTPException(404, 'Recall status not found')
    if row.is_system_default:
        raise HTTPException(400, 'Default status cannot be edited')
    in_use = c.db.scalar(select(func.count(m.PatientRecall.id)).where(m.PatientRecall.status_id == status_id)) or 0
    if in_use > 0:
        row.is_active = False
        row.updated_at = m.now()
    else:
        c.db.delete(row)
    c.audit('delete_recall_status', row, row.name)
    return {'deleted': True, 'id': status_id}


# ==============================================================================
# SETTINGS: RECALL PREFERENCES
# ==============================================================================
@router.get('/settings/recall-preferences')
def get_recall_preferences(c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    pref = c.db.get(m.RecallPreference, 1)
    return _serialize_preferences(pref)


@router.put('/settings/recall-preferences')
def update_recall_preferences(data: RecallPreferencesUpdate, c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    pref = c.db.get(m.RecallPreference, 1)
    pref.default_email_enabled = data.default_email_enabled
    pref.default_sms_enabled = data.default_sms_enabled
    pref.email_days_before = data.email_days_before
    pref.sms_days_before = data.sms_days_before
    pref.sms_template_text = data.sms_template_text.strip() or DEFAULT_SMS_TEMPLATE
    pref.mark_complete_on_send = data.mark_complete_on_send
    pref.updated_at = m.now()
    c.audit('update_recall_preferences', pref)
    return _serialize_preferences(pref)


# ==============================================================================
# FOLLOW-UP TEMPLATES
# ==============================================================================
@router.get('/recall-templates')
def list_recall_templates(c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    rows = c.db.scalars(
        select(m.RecallTemplate)
        .where(
            or_(
                m.RecallTemplate.category == 'PRACTICE',
                m.RecallTemplate.created_by == c.user.id,
            )
        )
        .order_by(m.RecallTemplate.category.desc(), m.RecallTemplate.created_at.asc())
    ).all()
    return [_serialize_template(r) for r in rows]


@router.post('/recall-templates')
def create_recall_template(data: RecallTemplateCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    row = m.RecallTemplate(
        id=str(uuid4()),
        category=data.category,
        name=data.name.strip(),
        items_json=[item.model_dump() for item in data.items],
        created_by=c.user.id,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_recall_template', row, row.name)
    return _serialize_template(row)


@router.delete('/recall-templates/{template_id}')
def delete_recall_template(template_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.RecallTemplate, template_id)
    if not row:
        raise HTTPException(404, 'Recall template not found')
    if row.category == 'PRACTICE' and row.name == 'Vaso-Meditech Follow-up':
        raise HTTPException(400, 'Default practice follow-up template cannot be deleted')
    c.db.delete(row)
    c.audit('delete_recall_template', row, row.name)
    return {'deleted': True, 'id': template_id}


# ==============================================================================
# PATIENT RECALLS CRUD
# ==============================================================================
def _resolve_recall_type(db, type_id: str | None, type_name: str | None) -> m.RecallType:
    if type_id:
        rt = db.get(m.RecallType, type_id)
        if rt:
            return rt
    if type_name:
        rt = db.scalar(select(m.RecallType).where(func.lower(m.RecallType.name) == type_name.strip().lower()))
        if rt:
            return rt
    rt = db.scalar(
        select(m.RecallType)
        .where(m.RecallType.is_active == True)  # noqa: E712
        .order_by(m.RecallType.display_order.asc())
        .limit(1)
    )
    if not rt:
        raise HTTPException(422, 'No active recall types configured')
    return rt


def _resolve_recall_status(db, status_id: str | None, default_name: str = 'Pending') -> m.RecallStatus:
    if status_id:
        rs = db.get(m.RecallStatus, status_id)
        if rs:
            return rs
    rs = db.scalar(select(m.RecallStatus).where(func.lower(m.RecallStatus.name) == default_name.lower()))
    if rs:
        return rs
    rs = db.scalar(select(m.RecallStatus).order_by(m.RecallStatus.display_order.asc()).limit(1))
    if not rs:
        raise HTTPException(422, 'No recall statuses configured')
    return rs


@router.get('/patients/{patient_id}/recalls')
def list_patient_recalls(
    patient_id: str,
    type_id: str | None = Query(default=None),
    status_id: str | None = Query(default=None),
    c=Depends(context),
):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    c.patient(patient_id)
    query = select(m.PatientRecall).where(
        m.PatientRecall.facility_id == c.facility_id,
        m.PatientRecall.patient_id == patient_id,
    )
    if type_id and type_id != 'All':
        query = query.where(m.PatientRecall.recall_type_id == type_id)
    if status_id and status_id != 'All':
        query = query.where(m.PatientRecall.status_id == status_id)
    rows = c.db.scalars(
        query.order_by(m.PatientRecall.due_date.desc(), m.PatientRecall.created_at.desc())
    ).all()
    return _serialize_recalls(c.db, rows)


@router.post('/patients/{patient_id}/recalls')
def create_patient_recalls(patient_id: str, data: PatientRecallCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    patient = c.patient(patient_id)
    today = _today_ist()
    items = data.items if data.items else [data]
    created: list[m.PatientRecall] = []

    for item in items:
        rt = _resolve_recall_type(c.db, item.recall_type_id, item.recall_type_name)
        rs = _resolve_recall_status(c.db, item.status_id, 'Pending')

        provider_id = item.provider_id or patient.provider_id or c.user.id
        provider = c.db.get(m.User, provider_id)
        if not provider:
            provider_id = c.user.id

        visit_dt = item.visit_date or today
        if item.due_date is not None:
            computed_due = item.due_date
        else:
            val = item.interval_value if item.interval_value is not None else 0
            computed_due = _compute_due_date(visit_dt, item.date_direction, val, item.interval_unit)

        auto_on = bool(item.auto_reminder_enabled)
        email_days = item.email_reminder_days if (auto_on and item.email_enabled) else None
        sms_days = item.sms_reminder_days if (auto_on and item.sms_enabled) else None
        if email_days is None and sms_days is None:
            auto_on = False

        row = m.PatientRecall(
            id=str(uuid4()),
            facility_id=c.facility_id,
            patient_id=patient_id,
            recall_type_id=rt.id,
            status_id=rs.id,
            provider_id=provider_id,
            notes=(item.notes or '').strip(),
            due_date=computed_due,
            visit_date=visit_dt,
            auto_reminder_enabled=auto_on,
            email_reminder_days=email_days,
            sms_reminder_days=sms_days,
            created_by=c.user.id,
            created_at=m.now(),
            updated_at=m.now(),
        )
        c.db.add(row)
        c.db.flush()
        c.audit('create_patient_recall', row, rt.name)
        created.append(row)

    serialized = _serialize_recalls(c.db, created)
    return serialized if data.items is not None else serialized[0]


@router.patch('/recalls/{recall_id}')
def update_patient_recall(recall_id: str, data: PatientRecallUpdate, c=Depends(context)):
    c.allow(ALL_STAFF)
    ensure_recalls_seed_data(c.db)
    row = c.db.get(m.PatientRecall, recall_id)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Recall not found in this branch')

    if data.recall_type_id is not None:
        rt = c.db.get(m.RecallType, data.recall_type_id)
        if not rt:
            raise HTTPException(422, 'Invalid recall type')
        row.recall_type_id = rt.id
    if data.mark_completed:
        completed = _resolve_recall_status(c.db, None, 'Completed')
        row.status_id = completed.id
    elif data.status_id is not None:
        rs = c.db.get(m.RecallStatus, data.status_id)
        if not rs:
            raise HTTPException(422, 'Invalid recall status')
        row.status_id = rs.id
    if data.provider_id is not None:
        c.staff(data.provider_id)
        row.provider_id = data.provider_id
    if data.notes is not None:
        row.notes = data.notes.strip()
    if data.due_date is not None:
        row.due_date = data.due_date
    if data.visit_date is not None:
        row.visit_date = data.visit_date
    if data.auto_reminder_enabled is not None:
        row.auto_reminder_enabled = data.auto_reminder_enabled
        if not data.auto_reminder_enabled:
            row.email_reminder_days = None
            row.sms_reminder_days = None
    if data.clear_email_reminder:
        row.email_reminder_days = None
    elif data.email_reminder_days is not None:
        row.email_reminder_days = data.email_reminder_days
    if data.clear_sms_reminder:
        row.sms_reminder_days = None
    elif data.sms_reminder_days is not None:
        row.sms_reminder_days = data.sms_reminder_days

    row.updated_at = m.now()
    c.audit('update_patient_recall', row)
    return _serialize_recalls(c.db, [row])[0]


@router.delete('/recalls/{recall_id}')
def delete_patient_recall(recall_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.PatientRecall, recall_id)
    if not row or row.facility_id != c.facility_id:
        raise HTTPException(404, 'Recall not found in this branch')
    c.db.delete(row)
    c.audit('delete_patient_recall', row)
    return {'deleted': True, 'id': recall_id}

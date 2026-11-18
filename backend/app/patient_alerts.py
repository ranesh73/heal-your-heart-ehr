"""Persistent Patient Alerts module (Patient Alerts Tab, Calendar Cards, Header Banner & On-Open Chart Popups)."""
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from . import models as m
from .security import context


router = APIRouter(prefix='/api')
ALL_STAFF = {'admin', 'doctor', 'assistant', 'therapist', 'reception', 'billing'}
ALERT_TYPES = ('medical_emergency', 'need_report', 'patient_status', 'contraindication')
SEVERITY_RANK = {
    'medical_emergency': 0,
    'contraindication': 1,
    'need_report': 2,
    'patient_status': 3,
}


class PatientAlertCreate(BaseModel):
    alert_type: Literal['medical_emergency', 'need_report', 'patient_status', 'contraindication'] = 'medical_emergency'
    description: str = Field(min_length=1, max_length=2000)


class PatientAlertUpdate(BaseModel):
    alert_type: Literal['medical_emergency', 'need_report', 'patient_status', 'contraindication'] | None = None
    description: str | None = Field(default=None, min_length=1, max_length=2000)


def _iso(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.isoformat() + 'Z'
    return dt.isoformat()


def _serialize_alert(row: m.PatientAlert) -> dict:
    return {
        'id': row.id,
        'patient_id': row.patient_id,
        'alert_type': row.alert_type,
        'description': row.description,
        'created_by_id': row.created_by_id,
        'created_by_name': row.created_by_name or 'Staff',
        'is_active': bool(row.is_active),
        'created_at': _iso(row.created_at),
        'updated_at': _iso(row.updated_at),
    }


def _sort_alerts(alerts: list[m.PatientAlert]) -> list[m.PatientAlert]:
    def _ts(dt):
        if not dt:
            return 0.0
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    return sorted(
        alerts,
        key=lambda a: (SEVERITY_RANK.get(a.alert_type, 99), -_ts(a.created_at)),
    )


def active_alerts_for_patients(db, patient_ids: list[str]) -> dict[str, list[dict]]:
    """Batch-load active alerts for multiple patients in a single SQL query (zero N+1)."""
    unique_ids = list({pid for pid in patient_ids if pid})
    if not unique_ids:
        return {}
    rows = db.scalars(
        select(m.PatientAlert).where(
            m.PatientAlert.patient_id.in_(unique_ids),
            m.PatientAlert.is_active == True,  # noqa: E712
        )
    ).all()
    grouped: dict[str, list[m.PatientAlert]] = {pid: [] for pid in unique_ids}
    for row in rows:
        grouped.setdefault(row.patient_id, []).append(row)
    return {
        pid: [_serialize_alert(a) for a in _sort_alerts(items)]
        for pid, items in grouped.items()
    }


def _get_alert_in_scope(c, alert_id: str) -> m.PatientAlert:
    row = c.db.get(m.PatientAlert, alert_id)
    if not row or not row.is_active:
        raise HTTPException(404, 'Alert not found')
    # Verify patient belongs to the user's active facility
    c.patient(row.patient_id)
    return row


@router.get('/patients/{patient_id}/alerts')
def list_patient_alerts(patient_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(patient_id)
    rows = c.db.scalars(
        select(m.PatientAlert).where(
            m.PatientAlert.patient_id == patient_id,
            m.PatientAlert.is_active == True,  # noqa: E712
        )
    ).all()
    return [_serialize_alert(a) for a in _sort_alerts(rows)]


@router.post('/patients/{patient_id}/alerts')
def create_patient_alert(patient_id: str, data: PatientAlertCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(patient_id)
    desc = data.description.strip()
    if not desc:
        raise HTTPException(422, 'Alert description is required')
    row = m.PatientAlert(
        id=str(uuid4()),
        patient_id=patient_id,
        alert_type=data.alert_type,
        description=desc,
        created_by_id=c.user.id,
        created_by_name=c.user.name,
        is_active=True,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_patient_alert', row, f'{row.alert_type}: {desc[:120]}')
    return _serialize_alert(row)


@router.put('/alerts/{alert_id}')
def update_patient_alert(alert_id: str, data: PatientAlertUpdate, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = _get_alert_in_scope(c, alert_id)
    if data.alert_type is not None:
        row.alert_type = data.alert_type
    if data.description is not None:
        desc = data.description.strip()
        if not desc:
            raise HTTPException(422, 'Alert description cannot be empty')
        row.description = desc
    row.updated_at = m.now()
    c.audit('update_patient_alert', row, f'{row.alert_type}: {row.description[:120]}')
    return _serialize_alert(row)


@router.delete('/alerts/{alert_id}')
def delete_patient_alert(alert_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = _get_alert_in_scope(c, alert_id)
    row.is_active = False
    row.updated_at = m.now()
    c.audit('delete_patient_alert', row, f'{row.alert_type}: {row.description[:120]}')
    return {'deleted': True, 'id': alert_id}

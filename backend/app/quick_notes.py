"""Patient Quick Notes & Calendar Sticky Notes module."""
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
STICKY_COLORS = ('yellow', 'mint', 'blue', 'pink')


class QuickNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    color: Literal['yellow', 'mint', 'blue', 'pink'] = 'yellow'


class QuickNoteUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=8000)
    color: Literal['yellow', 'mint', 'blue', 'pink'] | None = None


class QuickNoteBulkDelete(BaseModel):
    note_ids: list[str] = Field(min_length=1, max_length=200)


def _iso(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.isoformat() + 'Z'
    return dt.isoformat()


def _serialize_note(row: m.PatientQuickNote) -> dict:
    return {
        'id': row.id,
        'patient_id': row.patient_id,
        'content': row.content,
        'color': row.color or 'yellow',
        'created_by_id': row.created_by_id,
        'created_by_name': row.created_by_name or 'Staff',
        'created_at': _iso(row.created_at),
        'updated_at': _iso(row.updated_at),
    }


def quick_notes_for_patients(db, patient_ids: list[str]) -> dict[str, list[dict]]:
    """Batch-load quick notes for multiple patients in a single SQL query (zero N+1)."""
    unique_ids = list({pid for pid in patient_ids if pid})
    if not unique_ids:
        return {}
    rows = db.scalars(
        select(m.PatientQuickNote)
        .where(m.PatientQuickNote.patient_id.in_(unique_ids))
        .order_by(m.PatientQuickNote.created_at.desc())
    ).all()
    grouped: dict[str, list[dict]] = {pid: [] for pid in unique_ids}
    for row in rows:
        grouped.setdefault(row.patient_id, []).append(_serialize_note(row))
    return grouped


def _get_note_in_scope(c, note_id: str) -> m.PatientQuickNote:
    row = c.db.get(m.PatientQuickNote, note_id)
    if not row:
        raise HTTPException(404, 'Quick note not found')
    c.patient(row.patient_id)
    return row


@router.get('/patients/{patient_id}/quick-notes')
def list_patient_quick_notes(patient_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(patient_id)
    rows = c.db.scalars(
        select(m.PatientQuickNote)
        .where(m.PatientQuickNote.patient_id == patient_id)
        .order_by(m.PatientQuickNote.created_at.desc())
    ).all()
    return [_serialize_note(r) for r in rows]


@router.post('/patients/{patient_id}/quick-notes')
def create_patient_quick_note(patient_id: str, data: QuickNoteCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(patient_id)
    content = data.content.strip()
    if not content:
        raise HTTPException(422, 'Note content is required')
    row = m.PatientQuickNote(
        id=str(uuid4()),
        patient_id=patient_id,
        content=content,
        color=data.color or 'yellow',
        created_by_id=c.user.id,
        created_by_name=c.user.name,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_patient_quick_note', row, content[:120])
    return _serialize_note(row)


@router.put('/quick-notes/{note_id}')
def update_patient_quick_note(note_id: str, data: QuickNoteUpdate, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = _get_note_in_scope(c, note_id)
    if data.content is not None:
        content = data.content.strip()
        if not content:
            raise HTTPException(422, 'Note content cannot be empty')
        row.content = content
    if data.color is not None:
        row.color = data.color
    row.updated_at = m.now()
    c.audit('update_patient_quick_note', row, row.content[:120])
    return _serialize_note(row)


@router.delete('/quick-notes/{note_id}')
def delete_patient_quick_note(note_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = _get_note_in_scope(c, note_id)
    c.db.delete(row)
    c.audit('delete_patient_quick_note', row, row.content[:120])
    return {'deleted': True, 'id': note_id}


@router.post('/quick-notes/bulk-delete')
def bulk_delete_patient_quick_notes(data: QuickNoteBulkDelete, c=Depends(context)):
    c.allow(ALL_STAFF)
    deleted = 0
    for note_id in data.note_ids:
        row = _get_note_in_scope(c, note_id)
        c.db.delete(row)
        c.audit('delete_patient_quick_note', row, row.content[:120])
        deleted += 1
    return {'deleted': deleted}

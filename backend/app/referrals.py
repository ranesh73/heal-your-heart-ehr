"""Referrals Management module: Inbound & Outbound Specialist Referrals & Responses."""
import hashlib
import os
import re
from datetime import date, datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm.attributes import flag_modified

from . import models as m
from .db import DATA_DIR
from .security import context


router = APIRouter(prefix='/api')
ALL_STAFF = {'admin', 'doctor', 'assistant', 'therapist', 'reception', 'billing'}
CLINICAL = {'admin', 'doctor', 'assistant', 'therapist'}


# ============================================================================
# SCHEMAS
# ============================================================================

class ExternalProviderCreate(BaseModel):
    prefix: str = 'Dr'
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    middle_name: str = ''
    specialty: str = ''
    practice_name: str = ''
    about: str = ''
    fax: str = ''
    phone: str = ''
    extn: str = ''
    website: str = ''
    email: str = ''
    direct_address: str = ''
    address_line1: str = ''
    address_line2: str = ''
    city: str = ''
    state: str = ''
    country: str = 'India'
    postal_code: str = ''
    id_qualifier: str = ''
    identifier_value: str = ''


class ReferralCreate(BaseModel):
    direction: Literal['out', 'in'] = 'out'
    patient_id: str
    referral_from_name: str = Field(min_length=1, max_length=180)
    referral_from_id: str | None = None
    referral_to_type: Literal['external', 'internal'] = 'external'
    referral_to_name: str = Field(min_length=1, max_length=180)
    referral_to_provider_id: str | None = None
    referral_reason: str = Field(min_length=1, max_length=300)
    referral_date: date | None = None
    priority: Literal['Normal', 'Urgent', 'Stat'] = 'Normal'
    related_encounter_id: str | None = None
    referral_notes: str = ''
    diagnoses_json: list = Field(default_factory=list)
    insurance_json: list = Field(default_factory=list)
    attachments_json: list = Field(default_factory=list)
    request_status: Literal['Draft', 'Sent', 'Completed'] = 'Draft'


class ReferralUpdate(BaseModel):
    direction: Literal['out', 'in'] | None = None
    referral_from_name: str | None = None
    referral_from_id: str | None = None
    referral_to_type: Literal['external', 'internal'] | None = None
    referral_to_name: str | None = None
    referral_to_provider_id: str | None = None
    referral_reason: str | None = None
    referral_date: date | None = None
    priority: Literal['Normal', 'Urgent', 'Stat'] | None = None
    related_encounter_id: str | None = None
    referral_notes: str | None = None
    diagnoses_json: list | None = None
    insurance_json: list | None = None
    attachments_json: list | None = None
    request_status: Literal['Draft', 'Sent', 'Completed'] | None = None
    response_status: Literal['Pending', 'To Be Reviewed', 'Reviewed'] | None = None


class ReferralStatusPatch(BaseModel):
    response_status: Literal['Pending', 'To Be Reviewed', 'Reviewed'] | None = None
    request_status: Literal['Draft', 'Sent', 'Completed'] | None = None


class ReferralResponseSave(BaseModel):
    response_date: date | None = None
    response_notes: str = ''
    attachments_json: list = Field(default_factory=list)


# ============================================================================
# SEEDING & HELPERS
# ============================================================================

def _seed_external_providers_if_needed(db):
    count = db.scalar(select(func.count(m.ExternalProvider.id)))
    if count and count > 0:
        return
    defaults = [
        {
            'prefix': 'Dr',
            'first_name': 'Pradeep',
            'last_name': 'Nayar G',
            'specialty': 'Cardiology',
            'practice_name': 'MGM Healthcare',
            'about': 'Interventional cardiology',
            'phone': '9003070065',
            'email': 'pradeep.nayar@mgmhealthcare.com',
            'address_line1': '11, 52, 1st Main Rd, Gandhi Nagar',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'country': 'India',
            'postal_code': '600020',
        },
        {
            'prefix': 'Dr',
            'first_name': 'Meenakshi',
            'last_name': 'A',
            'specialty': 'OB/GYN',
            'practice_name': 'Private Practice',
            'about': 'Obstetrics and Gynecology Specialist',
            'phone': '9840123456',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'country': 'India',
            'postal_code': '600028',
        },
        {
            'prefix': 'Dr',
            'first_name': 'Madan',
            'last_name': 'Mohan B',
            'specialty': 'Cardiology',
            'practice_name': 'Private Practice',
            'about': 'Senior Consultant Cardiologist',
            'phone': '9840789012',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'country': 'India',
            'postal_code': '600004',
        },
        {
            'prefix': 'Dr',
            'first_name': 'Mohammed',
            'last_name': 'Abith Ali',
            'specialty': 'Cardiology',
            'practice_name': 'Private Practice',
            'about': 'Cardiology and Heart Failure Consultant',
            'phone': '9884567890',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'country': 'India',
            'postal_code': '600018',
        },
        {
            'prefix': 'Dr',
            'first_name': 'Ramasamy',
            'last_name': 'Subramanian',
            'specialty': 'Cardiology',
            'practice_name': 'Apollo Hospitals',
            'about': 'Cardiothoracic Surgery & Intervention',
            'phone': '9841234567',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'country': 'India',
            'postal_code': '600006',
        },
    ]
    for d in defaults:
        db.add(m.ExternalProvider(**d))
    db.commit()


def _seed_sample_referrals_if_needed(db, facility_id: str):
    count = db.scalar(select(func.count(m.Referral.id)))
    if count and count > 0:
        return
    pats = db.scalars(select(m.Patient).limit(6)).all()
    if not pats:
        return
    providers = db.scalars(select(m.ExternalProvider).order_by(m.ExternalProvider.first_name.asc())).all()
    if not providers:
        return

    pradeep = next((p for p in providers if 'Pradeep' in p.first_name), providers[0])
    abith = next((p for p in providers if 'Abith' in p.last_name or 'Mohammed' in p.first_name), providers[0])
    subramanian = next((p for p in providers if 'Subramanian' in p.last_name), providers[0])
    meenakshi = next((p for p in providers if 'Meenakshi' in p.first_name), providers[0])

    from datetime import timedelta
    today = date.today()
    samples = [
        {
            'patient': pats[0],
            'prov': pradeep,
            'reason': 'echo',
            'notes': '<p>echo and resting 2D echocardiography report requested.</p>',
            'direction': 'out',
            'req_status': 'Draft',
            'resp_status': 'Pending',
            'date_offset': 0,
        },
        {
            'patient': pats[1] if len(pats) > 1 else pats[0],
            'prov': abith,
            'reason': 'Pre-EECP arrhythmia evaluation',
            'notes': '<p>Patient referred for 24-hr Holter review prior to commencing counterpulsation therapy.</p>',
            'direction': 'out',
            'req_status': 'Draft',
            'resp_status': 'Pending',
            'date_offset': 0,
        },
        {
            'patient': pats[0],
            'prov': pradeep,
            'reason': 'Cardiology clearance for EECP course',
            'notes': '<p>Refractory angina CCS Class III post-CABG, evaluated for EECP 35 sessions.</p>',
            'direction': 'out',
            'req_status': 'Draft',
            'resp_status': 'To Be Reviewed',
            'date_offset': 0,
            'has_response': True,
            'resp_notes': 'Echocardiography shows LVEF 48%. No hemodynamically significant valvular regurgitation. Patient clinically stable and cleared for EECP treatment.',
            'signed': False,
        },
        {
            'patient': pats[2] if len(pats) > 2 else pats[0],
            'prov': subramanian,
            'reason': 'Coronary revascularization consultation',
            'notes': '<p>Referred for surgical opinion on distal CAD anatomy.</p>',
            'direction': 'out',
            'req_status': 'Sent',
            'resp_status': 'Reviewed',
            'date_offset': -1,
            'has_response': True,
            'resp_notes': 'CAG images reviewed. Medical therapy with EECP trial strongly endorsed prior to consideration of repeat intervention.',
            'signed': True,
        },
        {
            'patient': pats[3] if len(pats) > 3 else pats[0],
            'prov': meenakshi,
            'reason': 'Comprehensive wellness assessment',
            'notes': '<p>Annual gynecological and preventive health review requested.</p>',
            'direction': 'out',
            'req_status': 'Draft',
            'resp_status': 'To Be Reviewed',
            'date_offset': -1,
            'has_response': True,
            'resp_notes': 'Preventive examination normal. Routine follow-up scheduled.',
            'signed': False,
        },
        {
            'patient': pats[0],
            'prov': pradeep,
            'reason': 'EECP Therapy Inbound Referral',
            'notes': '<p>External cardiology referral for 35 hours of enhanced external counterpulsation.</p>',
            'direction': 'in',
            'req_status': 'Draft',
            'resp_status': 'Pending',
            'date_offset': 0,
        },
    ]

    for s in samples:
        ref_id = str(uuid4())
        ref_row = m.Referral(
            id=ref_id,
            facility_id=facility_id,
            direction=s['direction'],
            patient_id=s['patient'].id,
            referral_from_name='Dr. Ramasamy S',
            referral_to_type='external',
            referral_to_name=f"{s['prov'].prefix} {s['prov'].first_name} {s['prov'].last_name}".strip(),
            referral_to_provider_id=s['prov'].id,
            referral_reason=s['reason'],
            referral_date=today + timedelta(days=s['date_offset']),
            priority='Normal',
            referral_notes=s['notes'],
            diagnoses_json=[{'code': 'I25.10', 'description': 'Atherosclerotic heart disease'}],
            insurance_json=[{'provider': 'Star Health Insurance', 'policy_number': 'SH-CARDIAC-981'}],
            attachments_json=[],
            request_status=s['req_status'],
            response_status=s['resp_status'],
            created_at=m.now(),
            updated_at=m.now(),
        )
        db.add(ref_row)
        if s.get('has_response'):
            resp_row = m.ReferralResponse(
                id=str(uuid4()),
                referral_id=ref_id,
                response_date=today + timedelta(days=s['date_offset']),
                response_notes=s.get('resp_notes', ''),
                attachments_json=[],
                is_signed=s.get('signed', False),
                signed_at=m.now() if s.get('signed') else None,
                created_at=m.now(),
                updated_at=m.now(),
            )
            db.add(resp_row)
    db.commit()


def _iso(dt):
    if not dt:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt.isoformat() + 'Z'
    return str(dt)


def _serialize_provider(p: m.ExternalProvider) -> dict:
    return {
        'id': p.id,
        'prefix': p.prefix,
        'first_name': p.first_name,
        'last_name': p.last_name,
        'full_name': f"{p.prefix} {p.first_name} {p.last_name}".strip(),
        'middle_name': p.middle_name,
        'specialty': p.specialty,
        'practice_name': p.practice_name,
        'about': p.about,
        'fax': p.fax,
        'phone': p.phone,
        'extn': p.extn,
        'website': p.website,
        'email': p.email,
        'direct_address': p.direct_address,
        'address_line1': p.address_line1,
        'address_line2': p.address_line2,
        'city': p.city,
        'state': p.state,
        'country': p.country,
        'postal_code': p.postal_code,
        'id_qualifier': p.id_qualifier,
        'identifier_value': p.identifier_value,
        'display_label': f"{p.prefix} {p.first_name} {p.last_name}" + (f" ( {p.specialty} )" if p.specialty else "") + (f" - {p.practice_name}" if p.practice_name else ""),
    }


def _serialize_response(r: m.ReferralResponse | None, db) -> dict | None:
    if not r:
        return None
    signed_by_name = ''
    if r.signed_by_id:
        u = db.get(m.User, r.signed_by_id)
        if u:
            signed_by_name = u.name
    return {
        'id': r.id,
        'referral_id': r.referral_id,
        'response_date': str(r.response_date) if r.response_date else None,
        'response_notes': r.response_notes or '',
        'attachments_json': r.attachments_json or [],
        'is_signed': bool(r.is_signed),
        'signed_by_id': r.signed_by_id,
        'signed_by_name': signed_by_name,
        'signed_at': _iso(r.signed_at),
        'created_at': _iso(r.created_at),
        'updated_at': _iso(r.updated_at),
    }


def _serialize_referral(row: m.Referral, db, patient: m.Patient | None = None, response: m.ReferralResponse | None = None) -> dict:
    pat = patient or db.get(m.Patient, row.patient_id)
    pat_name = f"{pat.first_name} {pat.last_name}".strip() if pat else 'Patient'
    mrn = pat.mrn if pat else ''

    resp = response
    if resp is None:
        resp = db.scalar(select(m.ReferralResponse).where(m.ReferralResponse.referral_id == row.id))

    # Details about Referral To provider (if external)
    ext_prov = None
    if row.referral_to_provider_id:
        p_row = db.get(m.ExternalProvider, row.referral_to_provider_id)
        if p_row:
            ext_prov = _serialize_provider(p_row)

    facility = db.get(m.Facility, row.facility_id)

    # Encounter info if linked
    encounter_title = ''
    if row.related_encounter_id:
        enc = db.get(m.Encounter, row.related_encounter_id)
        if enc:
            encounter_title = f"{enc.visit_type} ({str(enc.created_at.date()) if enc.created_at else ''})"

    return {
        'id': row.id,
        'facility_id': row.facility_id,
        'facility_name': facility.name if facility else '',
        'facility_phone': facility.phone if facility else '',
        'facility_address': facility.address if facility else '',
        'direction': row.direction,
        'patient_id': row.patient_id,
        'patient_name': pat_name,
        'patient_mrn': mrn,
        'patient_dob': str(pat.dob) if pat and pat.dob else '',
        'patient_sex': pat.sex if pat else '',
        'patient_gender': pat.sex if pat else '',
        'patient_phone': pat.phone if pat else '',
        'patient_email': pat.email if pat else '',
        'patient_address': f"{pat.address or ''} {pat.area or ''} {pat.city or ''} {pat.state or ''} {pat.postal_code or ''}".strip() if pat else '',
        'referral_from_name': row.referral_from_name,
        'referral_from_id': row.referral_from_id,
        'referral_to_type': row.referral_to_type,
        'referral_to_name': row.referral_to_name,
        'referral_to_provider_id': row.referral_to_provider_id,
        'referral_to_details': ext_prov,
        'referral_reason': row.referral_reason,
        'referral_date': str(row.referral_date) if row.referral_date else '',
        'priority': row.priority,
        'related_encounter_id': row.related_encounter_id,
        'related_encounter_title': encounter_title,
        'referral_notes': row.referral_notes or '',
        'diagnoses_json': row.diagnoses_json or [],
        'insurance_json': row.insurance_json or [],
        'attachments_json': row.attachments_json or [],
        'request_status': row.request_status,
        'response_status': row.response_status,
        'response': _serialize_response(resp, db),
        'created_by': row.created_by,
        'created_at': _iso(row.created_at),
        'updated_at': _iso(row.updated_at),
    }


# ============================================================================
# EXTERNAL PROVIDERS ENDPOINTS
# ============================================================================

@router.get('/external-providers')
def list_external_providers(q: str | None = None, c=Depends(context)):
    c.allow(ALL_STAFF)
    _seed_external_providers_if_needed(c.db)
    stmt = select(m.ExternalProvider).order_by(m.ExternalProvider.first_name.asc())
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(m.ExternalProvider.first_name).like(term),
                func.lower(m.ExternalProvider.last_name).like(term),
                func.lower(m.ExternalProvider.specialty).like(term),
                func.lower(m.ExternalProvider.practice_name).like(term),
                func.lower(m.ExternalProvider.city).like(term),
            )
        )
    rows = c.db.scalars(stmt.limit(100)).all()
    return [_serialize_provider(p) for p in rows]


@router.post('/external-providers')
def create_external_provider(data: ExternalProviderCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = m.ExternalProvider(
        id=str(uuid4()),
        prefix=data.prefix.strip() or 'Dr',
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        middle_name=data.middle_name.strip(),
        specialty=data.specialty.strip(),
        practice_name=data.practice_name.strip(),
        about=data.about.strip(),
        fax=data.fax.strip(),
        phone=data.phone.strip(),
        extn=data.extn.strip(),
        website=data.website.strip(),
        email=data.email.strip(),
        direct_address=data.direct_address.strip(),
        address_line1=data.address_line1.strip(),
        address_line2=data.address_line2.strip(),
        city=data.city.strip(),
        state=data.state.strip(),
        country=data.country.strip() or 'India',
        postal_code=data.postal_code.strip(),
        id_qualifier=data.id_qualifier.strip(),
        identifier_value=data.identifier_value.strip(),
        created_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_external_provider', row, f"{row.prefix} {row.first_name} {row.last_name}")
    return _serialize_provider(row)


# ============================================================================
# REFERRALS CRUD ENDPOINTS
# ============================================================================

@router.get('/referrals')
def list_global_referrals(
    direction: str = 'out',
    referral_from: str | None = None,
    referral_to: str | None = None,
    request_status: str | None = None,
    response_status: str | None = None,
    q: str | None = None,
    c=Depends(context),
):
    c.allow(ALL_STAFF)
    _seed_external_providers_if_needed(c.db)
    _seed_sample_referrals_if_needed(c.db, c.facility_id)
    stmt = (
        select(m.Referral)
        .where(m.Referral.facility_id == c.facility_id)
        .order_by(m.Referral.referral_date.desc(), m.Referral.created_at.desc())
    )

    if direction in ('out', 'in'):
        stmt = stmt.where(m.Referral.direction == direction)

    if referral_from and referral_from not in ('All', '-- Select --', ''):
        stmt = stmt.where(m.Referral.referral_from_name.ilike(f"%{referral_from.strip()}%"))

    if referral_to and referral_to not in ('All', '-- Select --', ''):
        stmt = stmt.where(m.Referral.referral_to_name.ilike(f"%{referral_to.strip()}%"))

    if request_status and request_status not in ('All', ''):
        stmt = stmt.where(m.Referral.request_status == request_status)

    if response_status and response_status not in ('All', ''):
        stmt = stmt.where(m.Referral.response_status == response_status)

    rows = c.db.scalars(stmt).all()

    # Preload patients for fast in-memory join
    patient_ids = list({r.patient_id for r in rows})
    patients_map = {}
    if patient_ids:
        p_rows = c.db.scalars(select(m.Patient).where(m.Patient.id.in_(patient_ids))).all()
        patients_map = {p.id: p for p in p_rows}

    # Filter by q (patient name or MRN)
    results = []
    q_term = (q or '').strip().lower()
    for r in rows:
        pat = patients_map.get(r.patient_id)
        if q_term and pat:
            full_name = f"{pat.first_name} {pat.last_name}".lower()
            mrn = (pat.mrn or '').lower()
            if q_term not in full_name and q_term not in mrn:
                continue
        elif q_term and not pat:
            continue
        results.append(_serialize_referral(r, c.db, patient=pat))

    return results


@router.get('/patients/{patient_id}/referrals')
def list_patient_referrals(patient_id: str, direction: str | None = None, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(patient_id)
    _seed_external_providers_if_needed(c.db)
    _seed_sample_referrals_if_needed(c.db, c.facility_id)
    stmt = (
        select(m.Referral)
        .where(m.Referral.patient_id == patient_id)
        .order_by(m.Referral.referral_date.desc(), m.Referral.created_at.desc())
    )
    if direction in ('out', 'in'):
        stmt = stmt.where(m.Referral.direction == direction)

    rows = c.db.scalars(stmt).all()
    pat = c.db.get(m.Patient, patient_id)
    return [_serialize_referral(r, c.db, patient=pat) for r in rows]


@router.get('/referrals/{referral_id}')
def get_referral_details(referral_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.Referral, referral_id)
    if not row:
        raise HTTPException(404, 'Referral not found')
    c.patient(row.patient_id)
    return _serialize_referral(row, c.db)


@router.post('/referrals')
def create_referral(data: ReferralCreate, c=Depends(context)):
    c.allow(ALL_STAFF)
    c.patient(data.patient_id)
    ref_date = data.referral_date or date.today()

    row = m.Referral(
        id=str(uuid4()),
        facility_id=c.facility_id,
        direction=data.direction,
        patient_id=data.patient_id,
        referral_from_name=data.referral_from_name.strip(),
        referral_from_id=data.referral_from_id,
        referral_to_type=data.referral_to_type,
        referral_to_name=data.referral_to_name.strip(),
        referral_to_provider_id=data.referral_to_provider_id,
        referral_reason=data.referral_reason.strip(),
        referral_date=ref_date,
        priority=data.priority,
        related_encounter_id=data.related_encounter_id,
        referral_notes=data.referral_notes or '',
        diagnoses_json=data.diagnoses_json or [],
        insurance_json=data.insurance_json or [],
        attachments_json=data.attachments_json or [],
        request_status=data.request_status,
        response_status='Pending',
        created_by=c.user.id,
        created_at=m.now(),
        updated_at=m.now(),
    )
    c.db.add(row)
    c.audit('create_referral', row, f"{row.direction.upper()}: {row.referral_to_name}")
    return _serialize_referral(row, c.db)


@router.put('/referrals/{referral_id}')
def update_referral(referral_id: str, data: ReferralUpdate, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.Referral, referral_id)
    if not row:
        raise HTTPException(404, 'Referral not found')
    c.patient(row.patient_id)

    if data.direction is not None:
        row.direction = data.direction
    if data.referral_from_name is not None:
        row.referral_from_name = data.referral_from_name.strip()
    if data.referral_from_id is not None:
        row.referral_from_id = data.referral_from_id
    if data.referral_to_type is not None:
        row.referral_to_type = data.referral_to_type
    if data.referral_to_name is not None:
        row.referral_to_name = data.referral_to_name.strip()
    if data.referral_to_provider_id is not None:
        row.referral_to_provider_id = data.referral_to_provider_id
    if data.referral_reason is not None:
        row.referral_reason = data.referral_reason.strip()
    if data.referral_date is not None:
        row.referral_date = data.referral_date
    if data.priority is not None:
        row.priority = data.priority
    if data.related_encounter_id is not None:
        row.related_encounter_id = data.related_encounter_id
    if data.referral_notes is not None:
        row.referral_notes = data.referral_notes
    if data.diagnoses_json is not None:
        row.diagnoses_json = data.diagnoses_json
    if data.insurance_json is not None:
        row.insurance_json = data.insurance_json
    if data.attachments_json is not None:
        row.attachments_json = data.attachments_json
    if data.request_status is not None:
        row.request_status = data.request_status
    if data.response_status is not None:
        row.response_status = data.response_status

    row.updated_at = m.now()
    c.audit('update_referral', row, f"{row.direction.upper()}: {row.referral_to_name}")
    return _serialize_referral(row, c.db)


@router.delete('/referrals/{referral_id}')
def delete_referral(referral_id: str, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.Referral, referral_id)
    if not row:
        raise HTTPException(404, 'Referral not found')
    c.patient(row.patient_id)
    c.db.delete(row)
    c.audit('delete_referral', row, referral_id)
    return {'deleted': True, 'id': referral_id}


@router.patch('/referrals/{referral_id}/status')
def patch_referral_status(referral_id: str, data: ReferralStatusPatch, c=Depends(context)):
    c.allow(ALL_STAFF)
    row = c.db.get(m.Referral, referral_id)
    if not row:
        raise HTTPException(404, 'Referral not found')
    c.patient(row.patient_id)

    if data.response_status:
        row.response_status = data.response_status
    if data.request_status:
        row.request_status = data.request_status
    row.updated_at = m.now()
    c.audit('patch_referral_status', row, f"response={row.response_status}, request={row.request_status}")
    return _serialize_referral(row, c.db)


# ============================================================================
# REFERRAL RESPONSE & ATTACHMENT SYNC WORKFLOW
# ============================================================================

@router.post('/referrals/{referral_id}/response')
def save_referral_response(referral_id: str, data: ReferralResponseSave, c=Depends(context)):
    c.allow(ALL_STAFF)
    ref = c.db.get(m.Referral, referral_id)
    if not ref:
        raise HTTPException(404, 'Referral not found')
    c.patient(ref.patient_id)

    resp = c.db.scalar(select(m.ReferralResponse).where(m.ReferralResponse.referral_id == referral_id))
    resp_date = data.response_date or date.today()

    if not resp:
        resp = m.ReferralResponse(
            id=str(uuid4()),
            referral_id=referral_id,
            response_date=resp_date,
            response_notes=data.response_notes or '',
            attachments_json=data.attachments_json or [],
            is_signed=False,
            created_at=m.now(),
            updated_at=m.now(),
        )
        c.db.add(resp)
    else:
        resp.response_date = resp_date
        resp.response_notes = data.response_notes or ''
        resp.attachments_json = data.attachments_json or []
        resp.updated_at = m.now()

    # Automatic Status Transition: if status was Pending, move to To Be Reviewed
    if ref.response_status == 'Pending':
        ref.response_status = 'To Be Reviewed'
        ref.updated_at = m.now()

    c.audit('save_referral_response', resp, f"Referral {referral_id}")
    return _serialize_referral(ref, c.db)


@router.post('/referrals/{referral_id}/response/sign')
def sign_referral_response(referral_id: str, c=Depends(context)):
    c.allow(CLINICAL)
    ref = c.db.get(m.Referral, referral_id)
    if not ref:
        raise HTTPException(404, 'Referral not found')
    c.patient(ref.patient_id)

    resp = c.db.scalar(select(m.ReferralResponse).where(m.ReferralResponse.referral_id == referral_id))
    if not resp:
        resp = m.ReferralResponse(
            id=str(uuid4()),
            referral_id=referral_id,
            response_date=date.today(),
            response_notes='',
            attachments_json=[],
            is_signed=True,
            signed_by_id=c.user.id,
            signed_at=m.now(),
            created_at=m.now(),
            updated_at=m.now(),
        )
        c.db.add(resp)
    else:
        resp.is_signed = True
        resp.signed_by_id = c.user.id
        resp.signed_at = m.now()
        resp.updated_at = m.now()

    # Marking response as signed changes referral response_status to Reviewed
    ref.response_status = 'Reviewed'
    ref.updated_at = m.now()

    c.audit('sign_referral_response', resp, f"Doctor {c.user.name} signed referral {referral_id}")
    return _serialize_referral(ref, c.db)


@router.post('/referrals/{referral_id}/upload-attachment')
async def upload_referral_attachment(
    referral_id: str,
    target: str = Form('referral'),  # 'referral' or 'response'
    file: UploadFile = File(...),
    c=Depends(context),
):
    """Uploads file from local drive, archives it in Patient Documents, and attaches to referral/response."""
    c.allow(ALL_STAFF)
    ref = c.db.get(m.Referral, referral_id)
    if not ref:
        raise HTTPException(404, 'Referral not found')
    c.patient(ref.patient_id)

    # Allow up to 25 MB for comprehensive clinical scans / diagnostic reports
    MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, 'File size exceeds maximum allowed limit of 25 MB')

    # Sanitize filename and prevent directory traversal
    raw_filename = file.filename or 'attachment.pdf'
    clean_base = Path(raw_filename).name
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_base) or 'attachment.pdf'

    # Validate / classify common clinical file types (.pdf, .png, .jpg, .jpeg, .doc, .docx)
    lower = safe_filename.lower()
    if lower.endswith('.pdf') or content.startswith(b'%PDF-'):
        mime = 'application/pdf'
    elif lower.endswith('.png') or content.startswith(b'\x89PNG\r\n\x1a\n'):
        mime = 'image/png'
    elif lower.endswith('.jpg') or lower.endswith('.jpeg') or content.startswith(b'\xff\xd8\xff'):
        mime = 'image/jpeg'
    elif lower.endswith('.docx') or content.startswith(b'PK\x03\x04'):
        mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    elif lower.endswith('.doc') or content.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
        mime = 'application/msword'
    else:
        mime = file.content_type or 'application/octet-stream'

    key = str(uuid4())
    folder = DATA_DIR / 'documents'
    os.makedirs(folder, exist_ok=True)
    file_path = folder / key
    file_path.write_bytes(content)

    # 1. Archive in Patient Documents
    doc_title = f"Referral {'Response' if target == 'response' else 'Letter'} Attachment: {safe_filename}"
    doc = m.Document(
        patient_id=ref.patient_id,
        facility_id=ref.facility_id,
        author_id=c.user.id,
        title=doc_title,
        filename=safe_filename,
        storage_key=key,
        mime=mime,
        size=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
    )
    c.db.add(doc)
    c.db.flush()

    attachment_meta = {
        'id': str(uuid4()),
        'referral_id': referral_id,
        'document_id': doc.id,
        'filename': safe_filename,
        'name': safe_filename,
        'content_type': mime,
        'mime': mime,
        'file_size': len(content),
        'size': len(content),
        'file_path': str(file_path),
        'url': f"/api/documents/{doc.id}/download",
        'download_url': f"/api/documents/{doc.id}/download",
        'uploaded_at': _iso(m.now()),
        'uploaded_by': c.user.name,
    }

    if target == 'response':
        resp = c.db.scalar(select(m.ReferralResponse).where(m.ReferralResponse.referral_id == referral_id))
        if not resp:
            resp = m.ReferralResponse(
                id=str(uuid4()),
                referral_id=referral_id,
                response_date=date.today(),
                response_notes='',
                attachments_json=[attachment_meta],
                is_signed=False,
                created_at=m.now(),
                updated_at=m.now(),
            )
            c.db.add(resp)
        else:
            cur = list(resp.attachments_json or [])
            cur.append(attachment_meta)
            resp.attachments_json = cur
            resp.updated_at = m.now()
            flag_modified(resp, 'attachments_json')

        if ref.response_status == 'Pending':
            ref.response_status = 'To Be Reviewed'
            ref.updated_at = m.now()
    else:
        cur = list(ref.attachments_json or [])
        cur.append(attachment_meta)
        ref.attachments_json = cur
        ref.updated_at = m.now()
        flag_modified(ref, 'attachments_json')

    c.db.flush()
    c.audit('upload_referral_attachment', ref, safe_filename)

    return {
        'id': attachment_meta['id'],
        'referral_id': referral_id,
        'filename': safe_filename,
        'name': safe_filename,
        'content_type': mime,
        'mime': mime,
        'file_size': len(content),
        'size': len(content),
        'file_path': str(file_path),
        'url': attachment_meta['download_url'],
        'download_url': attachment_meta['download_url'],
        'uploaded_at': attachment_meta['uploaded_at'],
        'uploaded_by': attachment_meta['uploaded_by'],
        'attachment': attachment_meta,
        'document_id': doc.id,
        'referral': _serialize_referral(ref, c.db),
    }


@router.get('/referrals/{referral_id}/attachments/{attachment_id}/download')
def download_referral_attachment(referral_id: str, attachment_id: str, c=Depends(context)):
    """Directly download or stream an attachment file associated with a referral or referral response."""
    c.allow(ALL_STAFF)
    ref = c.db.get(m.Referral, referral_id)
    if not ref:
        raise HTTPException(404, 'Referral not found')
    c.patient(ref.patient_id)

    att = None
    for a in (ref.attachments_json or []):
        if a.get('id') == attachment_id:
            att = a
            break
    if not att:
        resp = c.db.scalar(select(m.ReferralResponse).where(m.ReferralResponse.referral_id == referral_id))
        if resp:
            for a in (resp.attachments_json or []):
                if a.get('id') == attachment_id:
                    att = a
                    break
    if not att:
        raise HTTPException(404, 'Attachment not found')

    doc_id = att.get('document_id')
    if doc_id:
        doc = c.db.get(m.Document, doc_id)
        if doc:
            path = DATA_DIR / 'documents' / doc.storage_key
            if path.is_file():
                return FileResponse(path, media_type=doc.mime or 'application/octet-stream', filename=doc.filename)

    raise HTTPException(404, 'Document file unavailable')


# ============================================================================
# LETTERHEAD PDF GENERATION FOR REFERRALS
# ============================================================================

def _clean_html_to_text(html_content: str) -> str:
    if not html_content:
        return ''
    import re
    # Convert <br> and </p> to newlines
    text = re.sub(r'<\s*br\s*/?>', '\n', html_content, flags=re.I)
    text = re.sub(r'</\s*p\s*>', '\n\n', text, flags=re.I)
    text = re.sub(r'<\s*li\s*>', ' • ', text, flags=re.I)
    text = re.sub(r'</\s*li\s*>', '\n', text, flags=re.I)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    import html
    return html.unescape(text).strip()


@router.get('/referrals/{referral_id}/pdf')
def download_referral_pdf(referral_id: str, preview: bool = False, c=Depends(context)):
    """Generates an official printable referral letter with Heal Your Heart Clinic letterhead."""
    c.allow(ALL_STAFF)
    ref = c.db.get(m.Referral, referral_id)
    if not ref:
        raise HTTPException(404, 'Referral not found')
    c.patient(ref.patient_id)

    pat = c.db.get(m.Patient, ref.patient_id)
    fac = c.db.get(m.Facility, ref.facility_id)

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    from .consultations import _draw_repeating_letterhead, _facility_info

    buffer = BytesIO()
    usable_w = A4[0] - 32 * mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=46 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RefTitle', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#0f766e'))
    sec_heading = ParagraphStyle('SecHead', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=colors.HexColor('#0f766e'), spaceAfter=3)
    body_style = ParagraphStyle('RefBody', fontName='Helvetica', fontSize=9, leading=12.5, textColor=colors.HexColor('#1f2937'))
    cell_lbl = ParagraphStyle('RefCellLbl', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#475569'))
    cell_val = ParagraphStyle('RefCellVal', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#111827'))

    story = []

    # Referral Header Band
    story.append(Paragraph(f"<b>PATIENT REFERRAL LETTER ({ref.direction.upper()})</b>", title_style))
    story.append(Spacer(1, 4 * mm))

    # 3-Column Top Metadata Box: Patient | Referral From | Referral To
    pat_info = [
        Paragraph(f"<b>{pat.first_name} {pat.last_name}</b>", cell_val),
        Paragraph(f"MRN: {pat.mrn} · DOB: {str(pat.dob)}", cell_val),
        Paragraph(f"Gender: {pat.sex} · Mobile: {pat.phone or '—'}", cell_val),
        Paragraph(f"Email: {pat.email or '—'}", cell_val),
    ]

    from_info = [
        Paragraph(f"<b>{ref.referral_from_name}</b>", cell_val),
        Paragraph(f"{fac.name if fac else 'Heal Your Heart'}", cell_val),
        Paragraph(f"{fac.address if fac else ''}", cell_val),
        Paragraph(f"Phone: {fac.phone if fac else ''}", cell_val),
    ]

    to_info = [
        Paragraph(f"<b>{ref.referral_to_name}</b>", cell_val),
        Paragraph(f"Type: {ref.referral_to_type.capitalize()}", cell_val),
        Paragraph(f"Priority: {ref.priority}", cell_val),
    ]
    if ref.referral_to_provider_id:
        p_row = c.db.get(m.ExternalProvider, ref.referral_to_provider_id)
        if p_row:
            to_info.append(Paragraph(f"Specialty: {p_row.specialty or '—'}", cell_val))
            to_info.append(Paragraph(f"Hospital: {p_row.practice_name or '—'}", cell_val))
            to_info.append(Paragraph(f"Phone: {p_row.phone or '—'}", cell_val))

    meta_table = Table(
        [
            [Paragraph("<b>PATIENT</b>", cell_lbl), Paragraph("<b>REFERRAL FROM</b>", cell_lbl), Paragraph("<b>REFERRAL TO</b>", cell_lbl)],
            [pat_info, from_info, to_info],
        ],
        colWidths=[usable_w * 0.33, usable_w * 0.34, usable_w * 0.33],
    )
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 4 * mm))

    # Referral Reason & Details Strip
    det_rows = [
        [
            Paragraph(f"<b>Referral Date:</b> {str(ref.referral_date)}", cell_val),
            Paragraph(f"<b>Priority:</b> {ref.priority}", cell_val),
            Paragraph(f"<b>Request Status:</b> {ref.request_status}", cell_val),
            Paragraph(f"<b>Response Status:</b> {ref.response_status}", cell_val),
        ]
    ]
    det_table = Table(det_rows, colWidths=[usable_w * 0.25, usable_w * 0.25, usable_w * 0.25, usable_w * 0.25])
    det_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(det_table)
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph(f"<b>Reason for Referral:</b> {ref.referral_reason}", body_style))
    story.append(Spacer(1, 4 * mm))

    # Referral Notes
    story.append(Paragraph("<b>Referral Clinical Notes:</b>", sec_heading))
    clean_notes = _clean_html_to_text(ref.referral_notes) or "No detailed notes provided."
    for p_line in clean_notes.split('\n'):
        if p_line.strip():
            story.append(Paragraph(p_line, body_style))
    story.append(Spacer(1, 4 * mm))

    # Diagnoses & Insurance
    if ref.diagnoses_json:
        story.append(Paragraph("<b>Active Diagnoses (ICD-10):</b>", sec_heading))
        for d in ref.diagnoses_json:
            code = d.get('code') or ''
            desc = d.get('description') or d.get('name') or ''
            story.append(Paragraph(f"• <b>{code}</b> — {desc}", body_style))
        story.append(Spacer(1, 3 * mm))

    if ref.insurance_json:
        story.append(Paragraph("<b>Patient Insurance:</b>", sec_heading))
        for ins in ref.insurance_json:
            story.append(Paragraph(f"• {ins.get('name') or ins.get('provider') or 'Insurance'} (Policy: {ins.get('policy_number') or '—'})", body_style))
        story.append(Spacer(1, 3 * mm))

    # Attached Documents list
    if ref.attachments_json:
        story.append(Paragraph("<b>Attached Documents:</b>", sec_heading))
        for att in ref.attachments_json:
            story.append(Paragraph(f"• {att.get('name')} ({round(att.get('size', 0)/1024, 1)} KB)", body_style))
        story.append(Spacer(1, 3 * mm))

    # Response Section if recorded
    resp = c.db.scalar(select(m.ReferralResponse).where(m.ReferralResponse.referral_id == referral_id))
    if resp and resp.response_notes:
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#0f766e'), spaceAfter=3 * mm))
        story.append(Paragraph("<b>PROVIDER RESPONSE:</b>", sec_heading))
        story.append(Paragraph(f"<b>Date:</b> {str(resp.response_date)}", body_style))
        clean_resp = _clean_html_to_text(resp.response_notes)
        for r_line in clean_resp.split('\n'):
            if r_line.strip():
                story.append(Paragraph(r_line, body_style))
        if resp.is_signed:
            story.append(Paragraph(f"<i>✓ Signed and reviewed by provider on {str(resp.signed_at.date()) if resp.signed_at else ''}</i>", body_style))
        story.append(Spacer(1, 4 * mm))

    # Signature Block
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("____________________________", body_style))
    story.append(Paragraph(f"<b>{ref.referral_from_name}</b>", body_style))
    story.append(Paragraph(f"{fac.name if fac else 'Heal Your Heart'}", cell_lbl))

    # Letterhead callbacks
    meta_left = [
        ('Patient', f"{pat.first_name} {pat.last_name}"),
        ('MRN', pat.mrn),
        ('Referral Date', str(ref.referral_date)),
    ]
    meta_right = [
        ('Priority', ref.priority),
        ('Direction', ref.direction.upper()),
        ('Status', ref.response_status),
    ]

    fac_dict = _facility_info(fac)

    def _on_page(canvas, document):
        _draw_repeating_letterhead(
            canvas,
            document,
            fac_dict,
            meta_left,
            meta_right,
            str(date.today()),
            top_title="REFERRAL CONSULTATION LETTER",
        )

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    pdf_bytes = buffer.getvalue()

    filename = f"Referral_{pat.mrn}_{ref.direction}_{str(ref.referral_date)}.pdf"
    disposition = "inline" if preview else f'attachment; filename="{filename}"'
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={
            'Content-Disposition': disposition,
            'X-Content-Type-Options': 'nosniff',
        },
    )

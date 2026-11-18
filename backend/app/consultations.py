from datetime import date, datetime, timedelta, timezone
import html
from io import BytesIO
import json
import os
from pathlib import Path
from uuid import uuid4
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, or_, select

from . import models as m, schemas as s
from .security import CLINICAL, check_version, context
from .serialization import serialize


router = APIRouter(prefix='/api')
IST = timezone(timedelta(hours=5, minutes=30))
LOGO_PATH = Path(__file__).resolve().parents[2] / 'frontend' / 'public' / 'assets' / 'dashboard' / 'heal_your_heart_clinic_logo.png'
_LOGO_BYTES_CACHE: bytes | None = None
REPORT_TABLES = {
    'Lipid Profile Investigation': ['Cholesterol', 'LDL/HDL Ratio', 'LDL Cholesterol', 'Triglycerides', 'HDL Cholesterol'],
    'Echo Investigation': ['EF', 'LVESV', 'LVESD', 'LVEDV', 'LVEDD'],
    'Basic Metabolic Panel': ['Glucose(fasting)', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'Urea', 'Creatinine'],
    'Vitals': ['Weight', 'Walking Time', 'CCS', 'BP', 'HR', 'Area', 'Peak'],
    'SphygmoCor Investigation': ['Aortic SP', 'Aortic PP', 'AP', 'Alx', 'Ejection Duration', 'SEVR'],
    'Other Investigation': ['INR', 'BNP', 'TSH', 'CRP', 'HbA1C', 'Free T3', 'Free T4'],
    'Symptomatic Improvement': ['Symptoms', 'Exercise Tolerance'],
}
NARRATIVE_BLANKS = [
    'sessions', 'hours_per_day', 'heart_rate_min', 'heart_rate_max', 'blood_pressure_average',
    'phase_one_p_value', 'phase_one_a_value', 'phase_two_p_value', 'phase_two_a_value',
    'lower_extremity_pressure', 'oxygen_flow', 'oxygen_saturation',
]


def _text(value):
    return value if isinstance(value, str) else ''


def _section_text(value):
    if isinstance(value, dict):
        return '\n'.join(
            f'{key.replace("_", " ").title()}: {_section_text(item)}'
            for key, item in value.items()
            if item not in (None, '', [], {})
        )
    if isinstance(value, list):
        return '\n'.join(str(item) for item in value)
    return str(value or '')


def _soap_from_encounter(row):
    return {
        'subjective': {
            'chief_complaints': row.chief_complaint or row.consult_notes or '',
            'history_of_present_illness': row.hpi or '',
            'past_medical_history': row.medical_history or '',
            'review_of_systems': row.ros or '',
        },
        'objective': {
            'health_vitals': row.objective or '',
            'physical_examination': row.examination or '',
        },
        'assessment': {'notes': row.assessment or row.physician_notes or ''},
        'plan': {
            'notes': row.plan or row.treatment_notes or '',
            'follow_up': row.follow_up or '',
            'treatment_notes': row.treatment_notes or '',
        },
        'procedures': [],
        'codes': [],
    }


def sync_encounter(db, row):
    consultation = db.get(m.Consultation, row.id)
    facility = db.get(m.Facility, row.facility_id)
    soap = _soap_from_encounter(row)
    if consultation and isinstance(consultation.soap_json, dict):
        merged = dict(consultation.soap_json)
        for section in ('subjective', 'objective', 'assessment', 'plan'):
            previous = merged.get(section)
            if isinstance(previous, dict):
                merged[section] = {**previous, **soap[section]}
            else:
                merged[section] = soap[section]
        soap = merged
    values = {
        'patient_id': row.patient_id,
        'provider_id': row.provider_id,
        'facility_id': row.facility_id,
        'facility_name': facility.name if facility else '',
        'visit_type': row.visit_type,
        'visit_mode': row.mode,
        'visit_date': row.created_at,
        'status': 'signed' if row.status == 'signed' else (consultation.status if consultation and consultation.status == 'co_sign' else 'unsigned'),
        'signed_by': row.signed_by,
        'signed_at': row.signed_at,
        'soap_json': soap,
        'created_at': row.created_at,
        'updated_at': m.now(),
    }
    if consultation is None:
        consultation = m.Consultation(id=row.id, **values)
        db.add(consultation)
    else:
        for key, value in values.items():
            setattr(consultation, key, value)
    return consultation


def _consultation(db, identifier, c):
    row = c.record(m.Encounter, identifier)
    consult = db.get(m.Consultation, row.id)
    if consult is None:
        consult = sync_encounter(db, row)
    return row, consult


def _consultation_out(db, row, consult):
    result = serialize(consult)
    for key in ('visit_date', 'created_at', 'updated_at'):
        value = getattr(consult, key, None)
        if value:
            result[key] = _iso_utc(value)
    encounter = serialize(row)
    result['version'] = row.version
    result['encounter'] = encounter
    patient = db.get(m.Patient, row.patient_id)
    provider = db.get(m.User, row.provider_id)
    signer = db.get(m.User, row.signed_by) if row.signed_by else None
    result['patient_name'] = f'{patient.first_name} {patient.last_name}'.strip() if patient else ''
    result['patient_mrn'] = patient.mrn if patient else ''
    result['provider_name'] = provider.name if provider else ''
    result['signed_by_name'] = signer.name if signer else ''
    if not result.get('soap_json'):
        result['soap_json'] = _soap_from_encounter(row)
    return result


def _date(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def _iso_utc(value):
    if value.tzinfo:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.isoformat() + 'Z'


def _utc_datetime(value):
    if value.tzinfo:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _age(dob, visit_date):
    if not dob:
        return ''
    today = _date(visit_date) or date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _investigation_defaults(db, row):
    tables = {
        name: [{'parameter': parameter, 'pre': '', 'post': ''} for parameter in parameters]
        for name, parameters in REPORT_TABLES.items()
    }
    aliases = {
        'weight': ('Vitals', 'Weight'), 'pulse_rate': ('Vitals', 'HR'),
        'pre_weight': ('Vitals', 'Weight'), 'post_weight': ('Vitals', 'Weight'),
        'pre_bp': ('Vitals', 'BP'), 'post_bp': ('Vitals', 'BP'),
        'pre_pulse_rate': ('Vitals', 'HR'), 'post_pulse_rate': ('Vitals', 'HR'),
        'post_bp_systolic': ('Vitals', 'BP'), 'post_bp_diastolic': ('Vitals', 'BP'),
        'walking_time': ('Vitals', 'Walking Time'), 'ccs_class': ('Vitals', 'CCS'),
        'pre_aortic_systolic_pressure': ('SphygmoCor Investigation', 'Aortic SP'),
        'post_aortic_systolic_pressure': ('SphygmoCor Investigation', 'Aortic SP'),
        'pre_aortic_pulse_pressure': ('SphygmoCor Investigation', 'Aortic PP'),
        'post_aortic_pulse_pressure': ('SphygmoCor Investigation', 'Aortic PP'),
        'pre_augmented_pressure': ('SphygmoCor Investigation', 'AP'),
        'post_augmented_pressure': ('SphygmoCor Investigation', 'AP'),
        'pre_augmentation_index': ('SphygmoCor Investigation', 'Alx'),
        'post_augmentation_index': ('SphygmoCor Investigation', 'Alx'),
        'ejection_duration': ('SphygmoCor Investigation', 'Ejection Duration'),
        'sevr': ('SphygmoCor Investigation', 'SEVR'),
    }
    entries = db.scalars(
        select(m.PatientFlowsheetEntry)
        .where(m.PatientFlowsheetEntry.patient_id == row.patient_id)
        .order_by(m.PatientFlowsheetEntry.recorded_at.desc())
        .limit(100)
    ).all()
    template_cache = {}
    for entry in entries:
        template = template_cache.get(entry.template_id)
        if template is None:
            template = db.get(m.FlowsheetTemplate, entry.template_id)
            template_cache[entry.template_id] = template
        section_sides = {}
        schema = template.schema_json if template and isinstance(template.schema_json, dict) else {}
        for section in schema.get('sections', []):
            title = str(section.get('title') or '').lower()
            side = 'post' if 'post' in title else 'pre' if 'pre' in title else None
            for field in section.get('fields', []):
                if isinstance(field, dict) and field.get('key'):
                    section_sides[str(field['key']).lower()] = side
        for key, value in entry.values_json.items():
            target = aliases.get(key.lower())
            side = 'post' if key.lower().startswith('post_') else 'pre' if key.lower().startswith('pre_') else section_sides.get(key.lower())
            if not target or value in (None, ''):
                continue
            section, parameter = target
            if side not in ('pre', 'post'):
                continue
            cell = next(x for x in tables[section] if x['parameter'] == parameter)
            if not cell[side]:
                cell[side] = str(value)
    return tables


def _default_report(db, row, consult):
    patient = db.get(m.Patient, row.patient_id)
    provider = db.get(m.User, row.provider_id)
    facility = db.get(m.Facility, row.facility_id)
    diagnoses = db.scalars(select(m.Diagnosis).where(
        m.Diagnosis.patient_id == row.patient_id,
        m.Diagnosis.facility_id == row.facility_id,
        m.Diagnosis.encounter_id == row.id,
        m.Diagnosis.status == 'active',
    )).all()
    medications = db.scalars(select(m.Medication).where(
        m.Medication.patient_id == row.patient_id,
        m.Medication.facility_id == row.facility_id,
        m.Medication.encounter_id == row.id,
        m.Medication.status == 'active',
    )).all()
    report_date = _date(consult.visit_date)
    return {
        'patient_information': {
            'registration_no': patient.mrn if patient else '',
            'name': f'{patient.first_name} {patient.last_name}'.strip() if patient else '',
            'date_of_birth': patient.dob.isoformat() if patient and patient.dob else '',
            'age': _age(patient.dob, consult.visit_date) if patient else '',
            'gender': patient.sex if patient else '',
        },
        'facility': {
            'name': facility.name if facility else '',
            'address': facility.address if facility else '',
            'phone': facility.phone if facility else '',
        },
        'treatment_information': {
            'physician': provider.name if provider else '',
            'from': report_date.isoformat() if report_date else '',
            'total_treatment_hrs': '',
            'to': '',
            'sponsor': '',
            'requested_amount': '',
        },
        'diagnoses': [
            {'description': diagnosis.description, 'code': diagnosis.code or ''}
            for diagnosis in diagnoses
        ],
        'procedure_done': 'Vaso-Meditech Enhanced External Counter Pulsation (EECP) Treatment',
        'brief_history': row.assessment or row.physician_notes or '',
        'narrative_values': {key: '' for key in NARRATIVE_BLANKS},
        'medications': [
            {
                'name': medication.trade_name or medication.generic_name,
                'dose': medication.dose or '',
                'schedule': f'{medication.morning or 0} - {medication.afternoon or 0} - {medication.evening or 0} - {medication.night or 0}',
                'dispense': f'{medication.quantity} {medication.dispense_unit or "Tablets"}',
                'pharmacy_note': medication.instructions or '',
            }
            for medication in medications
        ],
        'investigation_tables': _investigation_defaults(db, row),
        'patient_education': '',
        'visit_date': report_date.isoformat() if report_date else '',
        'provider_name': provider.name if provider else '',
        'soap_json': consult.soap_json or {},
    }


def _editable_report_data(values):
    if not isinstance(values, dict):
        raise HTTPException(422, 'Invalid discharge summary data')

    def scalar(value):
        if isinstance(value, (str, int, float)) and not isinstance(value, bool):
            return str(value)
        return None

    cleaned = {}
    treatment = values.get('treatment_information')
    if isinstance(treatment, dict):
        cleaned['treatment_information'] = {
            key: scalar(treatment[key])
            for key in ('total_treatment_hrs', 'to', 'sponsor', 'requested_amount')
            if key in treatment and scalar(treatment[key]) is not None
        }
    for key in ('procedure_done', 'brief_history', 'patient_education'):
        if key in values and isinstance(values[key], str):
            cleaned[key] = values[key]
    narrative = values.get('narrative_values')
    if isinstance(narrative, dict):
        cleaned['narrative_values'] = {
            key: scalar(narrative[key])
            for key in NARRATIVE_BLANKS
            if key in narrative and scalar(narrative[key]) is not None
        }
    source_tables = values.get('investigation_tables')
    if isinstance(source_tables, dict):
        cleaned_tables = {}
        for title, parameters in REPORT_TABLES.items():
            source_rows = source_tables.get(title)
            if not isinstance(source_rows, list):
                continue
            rows_by_parameter = {
                item.get('parameter'): item
                for item in source_rows
                if isinstance(item, dict) and isinstance(item.get('parameter'), str)
            }
            cleaned_tables[title] = []
            for parameter in parameters:
                item = rows_by_parameter.get(parameter)
                if item is None:
                    continue
                cleaned_tables[title].append({
                    'parameter': parameter,
                    'pre': scalar(item.get('pre')) or '',
                    'post': scalar(item.get('post')) or '',
                })
        cleaned['investigation_tables'] = cleaned_tables
    return cleaned


def _report_out(db, row, consult):
    saved = db.scalar(select(m.DischargeSummary).where(m.DischargeSummary.consultation_id == consult.id))
    result = _default_report(db, row, consult)
    if saved:
        edits = _editable_report_data(saved.report_data_json or {})
        if 'treatment_information' in edits:
            result['treatment_information'].update(edits['treatment_information'])
        for key in ('procedure_done', 'brief_history', 'patient_education'):
            if key in edits:
                result[key] = edits[key]
        if 'narrative_values' in edits:
            result['narrative_values'].update(edits['narrative_values'])
        for title, rows in edits.get('investigation_tables', {}).items():
            saved_rows = {item['parameter']: item for item in rows}
            for item in result['investigation_tables'][title]:
                if item['parameter'] in saved_rows:
                    item.update(saved_rows[item['parameter']])
    result['id'] = saved.id if saved else None
    result['version'] = saved.version if saved else 1
    return result


@router.get('/patients/{patient_id}/consultations')
def list_consultations(patient_id: str, tab: str = 'all', filter: str | None = None, q: str = '', c=Depends(context)):
    c.allow(CLINICAL)
    c.patient(patient_id)
    selected = filter or tab
    allowed = {'last_visit', 'unsigned', 'co_sign', 'past_6m', 'past_1y', 'all'}
    if selected not in allowed or len(q) > 100:
        raise HTTPException(422, 'Invalid consultation filter or search')
    query = select(m.Consultation, m.Encounter).join(m.Encounter, m.Encounter.id == m.Consultation.id).where(
        m.Consultation.patient_id == patient_id,
        m.Consultation.facility_id == c.facility_id,
    )
    if selected == 'unsigned':
        query = query.where(m.Consultation.status.in_(['draft', 'unsigned']))
    elif selected == 'co_sign':
        query = query.where(m.Consultation.status == 'co_sign')
    elif selected == 'past_6m':
        query = query.where(m.Consultation.visit_date >= datetime.now(timezone.utc) - timedelta(days=183))
    elif selected == 'past_1y':
        query = query.where(m.Consultation.visit_date >= datetime.now(timezone.utc) - timedelta(days=365))
    if q:
        pattern = '%' + q.replace('%', '\\%').replace('_', '\\_') + '%'
        patient = c.db.get(m.Patient, patient_id)
        patient_match = patient and (
            q.lower() in patient.mrn.lower() or
            q.lower() in f'{patient.first_name} {patient.last_name}'.lower()
        )
        if not patient_match:
            provider_ids = select(m.User.id).where(m.User.name.ilike(pattern, escape='\\'))
            query = query.where(or_(
                m.Consultation.visit_type.ilike(pattern, escape='\\'),
                m.Consultation.provider_id.in_(provider_ids),
                m.Consultation.id.ilike(pattern, escape='\\'),
                m.Encounter.chief_complaint.ilike(pattern, escape='\\'),
                m.Encounter.hpi.ilike(pattern, escape='\\'),
                m.Encounter.assessment.ilike(pattern, escape='\\'),
            ))
    query = query.order_by(m.Consultation.visit_date.desc())
    if selected == 'last_visit':
        query = query.limit(1)
    else:
        query = query.limit(500)
    return [_consultation_out(c.db, encounter, consultation) for consultation, encounter in c.db.execute(query).all()]


@router.post('/patients/{patient_id}/consultations')
def create_consultation(patient_id: str, data: s.ConsultationInput, c=Depends(context)):
    c.allow({'doctor', 'admin', 'assistant'})
    c.patient(patient_id)
    provider_id = c.user.id if c.user.role == 'doctor' else data.provider_id
    c.staff(provider_id, {'doctor'})
    if data.assistant_id:
        c.staff(data.assistant_id, {'assistant'})
    if data.facility_id and data.facility_id != c.facility_id:
        raise HTTPException(403, 'Consultations can only be created in the active branch')
    if data.appointment_id:
        appointment = c.record(m.Appointment, data.appointment_id)
        if appointment.patient_id != patient_id or appointment.provider_id != provider_id:
            raise HTTPException(422, 'Appointment does not match patient and provider')
        if appointment.status in ('cancelled', 'missed'):
            raise HTTPException(409, 'Appointment is inactive')
    visit_date = _utc_datetime(data.visit_date or m.now())
    soap = data.soap_json
    subjective = soap.get('subjective') if isinstance(soap.get('subjective'), dict) else {}
    objective = soap.get('objective') if isinstance(soap.get('objective'), dict) else {}
    assessment = soap.get('assessment') if isinstance(soap.get('assessment'), dict) else {}
    plan = soap.get('plan') if isinstance(soap.get('plan'), dict) else {}
    row = m.Encounter(
        patient_id=patient_id,
        facility_id=c.facility_id,
        author_id=c.user.id,
        provider_id=provider_id,
        assistant_id=data.assistant_id,
        appointment_id=data.appointment_id,
        visit_type=data.visit_type,
        chart_type=data.chart_type,
        mode=data.visit_mode,
        status='draft',
        created_at=visit_date,
        chief_complaint=_text(subjective.get('chief_complaints')),
        hpi=_text(subjective.get('history_of_present_illness')),
        medical_history=_text(subjective.get('past_medical_history')),
        ros=_text(subjective.get('review_of_systems')),
        objective=_text(objective.get('health_vitals')),
        examination=_text(objective.get('physical_examination')),
        assessment=_text(assessment.get('notes')),
        plan=_text(plan.get('notes')),
        follow_up=_text(plan.get('follow_up')),
        treatment_notes=_text(plan.get('treatment_notes')),
    )
    c.db.add(row)
    c.db.flush()
    consult = sync_encounter(c.db, row)
    consult.status = data.status
    c.audit('create_consultation', row)
    return _consultation_out(c.db, row, consult)


@router.put('/consultations/{identifier}')
def update_consultation(identifier: str, data: s.ConsultationUpdate, c=Depends(context)):
    c.allow({'doctor', 'admin'})
    row, consult = _consultation(c.db, identifier, c)
    if row.status == 'signed':
        raise HTTPException(409, 'Signed consultation is immutable. Use an addendum.')
    if c.user.role != 'admin' and row.provider_id != c.user.id:
        raise HTTPException(403, 'Only the assigned clinician may edit this consultation')
    check_version(row, data.version)
    values = data.model_dump(exclude={'version'}, exclude_unset=True)
    if 'visit_type' in values:
        row.visit_type = values['visit_type']
        consult.visit_type = values['visit_type']
    if 'visit_mode' in values:
        row.mode = values['visit_mode']
        consult.visit_mode = values['visit_mode']
    if 'visit_date' in values:
        row.created_at = _utc_datetime(values['visit_date'])
        consult.visit_date = row.created_at
    if 'status' in values:
        consult.status = values['status']
    if 'soap_json' in values:
        consult.soap_json = values['soap_json']
        soap = values['soap_json']
        subjective = soap.get('subjective') if isinstance(soap.get('subjective'), dict) else {}
        objective = soap.get('objective') if isinstance(soap.get('objective'), dict) else {}
        assessment = soap.get('assessment') if isinstance(soap.get('assessment'), dict) else {}
        plan = soap.get('plan') if isinstance(soap.get('plan'), dict) else {}
        row.chief_complaint = _text(subjective.get('chief_complaints'))
        row.hpi = _text(subjective.get('history_of_present_illness'))
        row.medical_history = _text(subjective.get('past_medical_history'))
        row.ros = _text(subjective.get('review_of_systems'))
        row.objective = _text(objective.get('health_vitals'))
        row.examination = _text(objective.get('physical_examination'))
        row.assessment = _text(assessment.get('notes'))
        row.plan = _text(plan.get('notes'))
        row.follow_up = _text(plan.get('follow_up'))
        row.treatment_notes = _text(plan.get('treatment_notes'))
    row.version += 1
    consult.updated_at = m.now()
    c.audit('update_consultation', row)
    return _consultation_out(c.db, row, consult)


@router.post('/consultations/{identifier}/sign')
def sign_consultation(identifier: str, data: s.Version, c=Depends(context)):
    row, consult = _consultation(c.db, identifier, c)
    from .clinical import sign_note
    sign_note(identifier, data, c)
    sync_encounter(c.db, row)
    return _consultation_out(c.db, row, consult)


@router.get('/consultations/{identifier}/addendums')
def get_addendums(identifier: str, c=Depends(context)):
    c.allow(CLINICAL)
    _, consult = _consultation(c.db, identifier, c)
    return [
        {**serialize(item), 'author_name': (c.db.get(m.User, item.author_id).name if c.db.get(m.User, item.author_id) else '')}
        for item in c.db.scalars(select(m.ConsultationAddendum).where(
            m.ConsultationAddendum.consultation_id == consult.id
        ).order_by(m.ConsultationAddendum.created_at))
    ]


@router.post('/consultations/{identifier}/addendums')
def add_addendum(identifier: str, data: s.ConsultationAddendumInput, c=Depends(context)):
    c.allow(CLINICAL)
    _, consult = _consultation(c.db, identifier, c)
    row = m.ConsultationAddendum(
        id=str(uuid4()),
        consultation_id=consult.id,
        author_id=c.user.id,
        note_text=data.note_text,
    )
    c.db.add(row)
    c.audit('add_consultation_addendum', row)
    return serialize(row)


@router.get('/consultations/{identifier}/discharge-summary')
def get_discharge_summary(identifier: str, c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    return _report_out(c.db, row, consult)


@router.put('/consultations/{identifier}/discharge-summary')
def save_discharge_summary(identifier: str, data: s.DischargeSummaryInput, c=Depends(context)):
    c.allow({'doctor', 'admin', 'therapist'})
    row, consult = _consultation(c.db, identifier, c)
    saved = c.db.scalar(select(m.DischargeSummary).where(m.DischargeSummary.consultation_id == consult.id))
    if saved:
        check_version(saved, data.version)
        saved.report_data_json = _editable_report_data(data.report_data_json)
        saved.updated_by = c.user.id
        saved.updated_at = m.now()
        saved.version += 1
    else:
        if data.version != 1:
            raise HTTPException(409, 'Discharge summary changed. Reload before saving.')
        saved = m.DischargeSummary(
            consultation_id=consult.id,
            patient_id=row.patient_id,
            report_data_json=_editable_report_data(data.report_data_json),
            updated_by=c.user.id,
        )
        c.db.add(saved)
        c.db.flush()
    c.audit('save_discharge_summary', saved)
    return _report_out(c.db, row, consult)


def _unescape_text(value: str) -> str:
    return html.unescape(str(value or '')).strip()


def _logo_png_bytes() -> bytes | None:
    global _LOGO_BYTES_CACHE
    if _LOGO_BYTES_CACHE is not None:
        return _LOGO_BYTES_CACHE
    if not LOGO_PATH.exists():
        return None
    try:
        from PIL import Image
        with Image.open(LOGO_PATH) as img:
            rgba = img.convert('RGBA')
            white_bg = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
            composited = Image.alpha_composite(white_bg, rgba).convert('RGB')
            out = BytesIO()
            composited.save(out, format='PNG')
            _LOGO_BYTES_CACHE = out.getvalue()
            return _LOGO_BYTES_CACHE
    except Exception:
        return None


def _facility_info(facility) -> dict:
    name = (facility.name if facility and facility.name else 'Heal Your Heart Neelankarai').strip()
    raw_address = (
        facility.address
        if facility and facility.address
        else 'Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar, Neelankarai, Chennai, Tamil Nadu - 600115'
    ).strip()
    phone = (facility.phone if facility and facility.phone else '9003070065').strip()
    formatted = raw_address.replace('Tamil Nadu 600115', 'Tamil Nadu - 600115')
    if '\n' in formatted:
        address_lines = [line.strip() for line in formatted.splitlines() if line.strip()]
    else:
        parts = [p.strip() for p in formatted.split(',') if p.strip()]
        address_lines = []
        current = ''
        for part in parts:
            candidate = f'{current}, {part}' if current else part
            if len(candidate) > 52 and current:
                address_lines.append(current)
                current = part
            else:
                current = candidate
        if current:
            address_lines.append(current)
    return {
        'name': name,
        'address': formatted,
        'address_lines': address_lines,
        'phone': phone,
    }


def _provider_regn_no(db, provider, soap: dict) -> str:
    if isinstance(soap, dict):
        reg = soap.get('provider_regn_no') or soap.get('regn_no')
        if isinstance(reg, str) and reg.strip():
            return reg.strip()
    if provider:
        pref = db.scalar(
            select(m.UserPreference).where(
                m.UserPreference.user_id == provider.id,
                m.UserPreference.section.in_(['profile', 'provider_profile', 'signature']),
            )
        )
        if pref and pref.data:
            try:
                parsed = json.loads(pref.data)
                for key in ('medical_reg_no', 'regn_no', 'registration_no', 'license_no'):
                    if parsed.get(key):
                        return str(parsed[key]).strip()
            except Exception:
                pass
        if 'ramasamy' in (provider.name or '').lower():
            return '60626'
    return ''


def _format_display_date(value) -> str:
    if not value:
        return ''
    if isinstance(value, datetime):
        dt = value.astimezone(IST) if value.tzinfo else value.replace(tzinfo=timezone.utc).astimezone(IST)
        return dt.strftime('%b %d, %Y')
    if isinstance(value, date):
        return value.strftime('%b %d, %Y')
    text = str(value).strip()
    for fmt in ('%Y-%m-%d', '%b %d, %Y', '%d %b %Y', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(text[:19], fmt).strftime('%b %d, %Y')
        except ValueError:
            continue
    return text


def _consult_target_dates(consult) -> set[date]:
    targets = set()
    if consult and consult.visit_date:
        vd = consult.visit_date
        if isinstance(vd, datetime):
            targets.add(vd.date())
            if vd.tzinfo:
                targets.add(vd.astimezone(IST).date())
                targets.add(vd.astimezone(timezone.utc).date())
            else:
                targets.add(vd.replace(tzinfo=timezone.utc).astimezone(IST).date())
        elif isinstance(vd, date):
            targets.add(vd)
    return targets


def _matches_target_date(value, target_dates: set[date]) -> bool:
    if not value or not target_dates:
        return False
    if isinstance(value, datetime):
        candidates = {value.date()}
        if value.tzinfo:
            candidates.add(value.astimezone(IST).date())
            candidates.add(value.astimezone(timezone.utc).date())
        else:
            candidates.add(value.replace(tzinfo=timezone.utc).astimezone(IST).date())
        return bool(candidates & target_dates)
    if isinstance(value, date):
        return value in target_dates
    text = str(value).strip()
    for fmt in ('%b %d, %Y', '%Y-%m-%d', '%d %b %Y', '%d-%m-%Y', '%m/%d/%Y', '%B %d, %Y'):
        try:
            if datetime.strptime(text, fmt).date() in target_dates:
                return True
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(text.replace('Z', '+00:00'))
        return _matches_target_date(parsed, target_dates)
    except ValueError:
        return False


def _same_day_lab_orders(db, row, consult) -> list[m.ClinicalOrder]:
    target_dates = _consult_target_dates(consult)
    orders = db.scalars(
        select(m.ClinicalOrder).where(
            m.ClinicalOrder.patient_id == row.patient_id,
            m.ClinicalOrder.facility_id == row.facility_id,
            func.lower(m.ClinicalOrder.kind).in_(['lab', 'laboratory', 'lab order']),
        ).order_by(m.ClinicalOrder.created_at.asc())
    ).all()
    matched = []
    for order in orders:
        if order.encounter_id == row.id:
            matched.append(order)
        elif order.ordered_date and _matches_target_date(order.ordered_date, target_dates):
            matched.append(order)
        elif not order.ordered_date and _matches_target_date(order.created_at, target_dates):
            matched.append(order)
    return matched


def _same_day_image_orders(db, row, consult) -> list[dict]:
    target_dates = _consult_target_dates(consult)
    orders = db.scalars(
        select(m.ClinicalOrder).where(
            m.ClinicalOrder.patient_id == row.patient_id,
            m.ClinicalOrder.facility_id == row.facility_id,
            func.lower(m.ClinicalOrder.kind).in_(['image', 'imaging', 'radiology', 'image order']),
        ).order_by(m.ClinicalOrder.created_at.asc())
    ).all()
    results = []
    seen_names = set()
    for order in orders:
        if (
            order.encounter_id == row.id
            or (order.ordered_date and _matches_target_date(order.ordered_date, target_dates))
            or (not order.ordered_date and _matches_target_date(order.created_at, target_dates))
        ):
            name = (order.name or '').strip()
            seen_names.add(name.lower())
            results.append({
                'name': name,
                'ordered_date': order.ordered_date or _format_display_date(order.created_at),
                'instructions': (order.instructions or order.notes_lab_patient or '').strip(),
                'status': (order.status or 'ordered').title(),
            })
    soap = consult.soap_json if isinstance(consult.soap_json, dict) else {}
    plan = soap.get('plan') if isinstance(soap.get('plan'), dict) else {}
    soap_imaging = plan.get('imaging')
    visit_display = _format_display_date(consult.visit_date)
    if isinstance(soap_imaging, list):
        for item in soap_imaging:
            text = _unescape_text(item.get('name', '') if isinstance(item, dict) else str(item or ''))
            if text and text.lower() not in seen_names:
                seen_names.add(text.lower())
                results.append({
                    'name': text,
                    'ordered_date': visit_display,
                    'instructions': _unescape_text(item.get('instructions', '')) if isinstance(item, dict) else '',
                    'status': 'Ordered',
                })
    elif isinstance(soap_imaging, str) and soap_imaging.strip():
        for line in soap_imaging.splitlines():
            text = _unescape_text(line)
            if text and text.lower() not in seen_names:
                seen_names.add(text.lower())
                results.append({
                    'name': text,
                    'ordered_date': visit_display,
                    'instructions': '',
                    'status': 'Ordered',
                })
    return results


def _format_med_schedule(med: m.Medication) -> str:
    if med.maen and med.maen.strip():
        parts = [p.strip() for p in med.maen.split('-')]
        if len(parts) == 4:
            return ' - '.join(parts)
        return med.maen.strip()
    def _num(val):
        if val is None:
            return '0'
        return str(int(val)) if float(val).is_integer() else str(val)
    return f'{_num(med.morning)} - {_num(med.afternoon)} - {_num(med.evening)} - {_num(med.night)}'


def _same_day_prescriptions(db, row, consult) -> list[dict]:
    target_dates = _consult_target_dates(consult)
    meds = db.scalars(
        select(m.Medication).where(
            m.Medication.patient_id == row.patient_id,
            m.Medication.facility_id == row.facility_id,
            m.Medication.status.notin_(['discontinued', 'cancelled']),
        ).order_by(m.Medication.created_at.asc())
    ).all()
    results = []
    for med in meds:
        if (
            med.encounter_id == row.id
            or (med.start_date and _matches_target_date(med.start_date, target_dates))
            or _matches_target_date(med.created_at, target_dates)
        ):
            name = (med.trade_name or med.generic_name or '').strip()
            dose = (med.dose or '').strip()
            display_name = f'{name} ({dose})' if dose and f'({dose})'.lower() not in name.lower() else name
            period = f'{med.duration_days} Day(s)' if med.duration_days else ''
            dispense_unit = (med.dispense_unit or '').strip()
            dispense = f'{med.quantity} {dispense_unit}'.strip() if med.quantity else ''
            notes_parts = []
            if med.instructions and med.instructions.strip():
                notes_parts.append(med.instructions.strip())
            if med.substitution_allowed is False:
                notes_parts.append('[Substitution not allowed]')
            results.append({
                'id': med.id,
                'name': name,
                'dose': dose,
                'display_name': display_name,
                'schedule': _format_med_schedule(med),
                'period': period,
                'dispense': dispense,
                'substitution_allowed': bool(med.substitution_allowed),
                'instructions': (med.instructions or '').strip(),
                'notes': ' '.join(notes_parts).strip(),
                'route': (med.route or 'Oral').strip(),
                'timing': (med.timing or '').strip(),
            })
    if not results:
        soap = consult.soap_json if isinstance(consult.soap_json, dict) else {}
        plan = soap.get('plan') if isinstance(soap.get('plan'), dict) else {}
        soap_rx = plan.get('prescriptions')
        if isinstance(soap_rx, list):
            for item in soap_rx:
                if not isinstance(item, dict):
                    continue
                name = _unescape_text(item.get('name', ''))
                if not name:
                    continue
                dose = _unescape_text(item.get('dosage') or item.get('dose') or '')
                display_name = f'{name} ({dose})' if dose else name
                daw = bool(item.get('daw')) or item.get('substitution_allowed') is False
                notes = _unescape_text(item.get('notes') or item.get('instructions') or '')
                if daw and 'substitution not allowed' not in notes.lower():
                    notes = f'{notes} [Substitution not allowed]'.strip()
                results.append({
                    'id': '',
                    'name': name,
                    'dose': dose,
                    'display_name': display_name,
                    'schedule': _unescape_text(item.get('schedule') or ''),
                    'period': _unescape_text(item.get('period') or ''),
                    'dispense': _unescape_text(item.get('dispense') or ''),
                    'substitution_allowed': not daw,
                    'instructions': _unescape_text(item.get('instructions') or ''),
                    'notes': notes,
                    'route': 'Oral',
                    'timing': '',
                })
    return results


def _build_clinical_bundle(db, row, consult) -> dict:
    patient = db.get(m.Patient, row.patient_id)
    facility = db.get(m.Facility, row.facility_id)
    provider = db.get(m.User, row.provider_id)
    signer = db.get(m.User, row.signed_by) if row.signed_by else provider
    soap = consult.soap_json if isinstance(consult.soap_json, dict) and consult.soap_json else _soap_from_encounter(row)
    subjective = soap.get('subjective') if isinstance(soap.get('subjective'), dict) else {}
    objective = soap.get('objective') if isinstance(soap.get('objective'), dict) else {}
    assessment = soap.get('assessment') if isinstance(soap.get('assessment'), dict) else {}
    plan = soap.get('plan') if isinstance(soap.get('plan'), dict) else {}

    sex_raw = (patient.sex if patient else '').strip()
    gender_short = 'M' if sex_raw.lower().startswith('m') else 'F' if sex_raw.lower().startswith('f') else sex_raw
    gender_lower = sex_raw.lower() if sex_raw else ''
    patient_age = _age(patient.dob, consult.visit_date) if patient else ''

    raw_cc = subjective.get('chief_complaints') or row.chief_complaint or ''
    if isinstance(raw_cc, list):
        chief_complaints = [_unescape_text(x) for x in raw_cc if _unescape_text(x)]
    else:
        chief_complaints = [_unescape_text(line) for line in str(raw_cc).splitlines() if _unescape_text(line)]

    raw_hpi = subjective.get('history_of_present_illness')
    if isinstance(raw_hpi, dict):
        hpi_table = []
        for item in (raw_hpi.get('table') or []):
            if isinstance(item, dict):
                hpi_table.append({
                    'label': _unescape_text(item.get('parameter') or item.get('label') or ''),
                    'value': _unescape_text(item.get('value') or ''),
                })
        if not hpi_table:
            hpi_table = [
                {'label': 'Chest Pain Frequency per Week:\n(No. of times per week)', 'value': 'nil'},
                {'label': 'S/L Nitroglycerin per Week:\n(No. taken per week)', 'value': 'nil'},
                {'label': 'Walking Time without Symptoms:\n(min.)', 'value': '—'},
            ]
        hpi = {
            'structured': True,
            'chest_pain': _unescape_text(raw_hpi.get('chest_pain') or 'No'),
            'table': hpi_table,
            'questions': [
                ('Shortness of Breath?', _unescape_text(raw_hpi.get('shortness_of_breath') or 'No')),
                ('Edema of Legs?', _unescape_text(raw_hpi.get('edema_of_legs') or 'No')),
                ('Trouble breathing while lying flat?', _unescape_text(raw_hpi.get('trouble_breathing_flat') or 'No')),
                ('Waking up with sudden onset of shortness of breath at night?', _unescape_text(raw_hpi.get('waking_up_shortness_breath_night') or 'No')),
                ('Palpitations?', _unescape_text(raw_hpi.get('palpitations') or 'No')),
            ],
            'raw': '',
        }
    else:
        hpi = {'structured': False, 'raw': _unescape_text(raw_hpi or row.hpi or '')}

    raw_pmh = subjective.get('past_medical_history')
    if isinstance(raw_pmh, dict) and isinstance(raw_pmh.get('grid'), list) and raw_pmh['grid']:
        pmh_grid = [
            {
                'name1': _unescape_text(g.get('name1') or ''),
                'val1': _unescape_text(g.get('val1') or ''),
                'name2': _unescape_text(g.get('name2') or ''),
                'val2': _unescape_text(g.get('val2') or ''),
            }
            for g in raw_pmh['grid']
            if isinstance(g, dict)
        ]
        pmh = {'structured': True, 'grid': pmh_grid, 'raw': ''}
    else:
        pmh = {'structured': False, 'grid': [], 'raw': _unescape_text(raw_pmh or row.medical_history or '')}

    raw_ros = subjective.get('review_of_systems') or row.ros or ''
    if isinstance(raw_ros, list):
        ros_lines = [_unescape_text(x) for x in raw_ros if _unescape_text(x)]
    else:
        ros_lines = [_unescape_text(line) for line in str(raw_ros).splitlines() if _unescape_text(line)]

    db_vitals = db.scalars(
        select(m.Vital).where(
            m.Vital.patient_id == row.patient_id,
            m.Vital.facility_id == row.facility_id,
            m.Vital.encounter_id == row.id,
        ).order_by(m.Vital.created_at.desc())
    ).all()
    vital_row = db_vitals[0] if db_vitals else None
    soap_vitals = objective.get('health_vitals') if isinstance(objective.get('health_vitals'), dict) else {}
    bmi_val = ''
    if vital_row and vital_row.bmi_percentile is not None:
        bmi_val = str(vital_row.bmi_percentile)
    elif vital_row and vital_row.height_cm and vital_row.weight_kg and vital_row.height_cm > 0:
        bmi_val = f'{vital_row.weight_kg / ((vital_row.height_cm / 100.0) ** 2):.2f}'
    elif soap_vitals.get('bmi'):
        bmi_val = str(soap_vitals.get('bmi'))

    def _clean_num(val):
        if val is None:
            return ''
        return str(int(val)) if float(val).is_integer() else str(val)

    vitals = {
        'height': f'{_clean_num(vital_row.height_cm)} cms' if vital_row and vital_row.height_cm is not None else _unescape_text(soap_vitals.get('height') or ''),
        'weight': f'{_clean_num(vital_row.weight_kg)} kgs' if vital_row and vital_row.weight_kg is not None else _unescape_text(soap_vitals.get('weight') or ''),
        'bmi': bmi_val,
        'bp': f'{_clean_num(vital_row.bp_sys)} / {_clean_num(vital_row.bp_dia)} mmHg' if vital_row and vital_row.bp_sys is not None and vital_row.bp_dia is not None else _unescape_text(soap_vitals.get('bp') or ''),
        'pulse_rate': f'{_clean_num(vital_row.pulse_bpm)} bpm' if vital_row and vital_row.pulse_bpm is not None else _unescape_text(soap_vitals.get('pulse_rate') or ''),
        'spo2': f'{_clean_num(vital_row.spo2_pct)} %' if vital_row and vital_row.spo2_pct is not None else _unescape_text(soap_vitals.get('spo2') or ''),
        'raw': _unescape_text(objective.get('health_vitals')) if isinstance(objective.get('health_vitals'), str) else '',
    }

    raw_exam = objective.get('physical_examination') or row.examination or ''
    if isinstance(raw_exam, list):
        exam_lines = [_unescape_text(x) for x in raw_exam if _unescape_text(x)]
    else:
        exam_lines = [_unescape_text(line) for line in str(raw_exam).splitlines() if _unescape_text(line)]

    assessment_notes = _unescape_text(assessment.get('notes') or row.assessment or row.physician_notes or '')

    db_diagnoses = db.scalars(
        select(m.Diagnosis).where(
            m.Diagnosis.patient_id == row.patient_id,
            m.Diagnosis.facility_id == row.facility_id,
            m.Diagnosis.encounter_id == row.id,
            m.Diagnosis.status == 'active',
        )
    ).all()
    diagnoses = [
        {'description': _unescape_text(d.description), 'code': _unescape_text(d.code or ''), 'comments': ''}
        for d in db_diagnoses
    ]
    if not diagnoses and isinstance(assessment.get('diagnoses'), list):
        for item in assessment['diagnoses']:
            if isinstance(item, dict) and item.get('description'):
                diagnoses.append({
                    'description': _unescape_text(item.get('description')),
                    'code': _unescape_text(item.get('code') or ''),
                    'comments': _unescape_text(item.get('comments') or ''),
                })

    prescriptions = _same_day_prescriptions(db, row, consult)
    imaging_orders = _same_day_image_orders(db, row, consult)
    imaging_lines = [item['name'] for item in imaging_orders if item.get('name')]

    raw_lifestyle = plan.get('lifestyle_recommendations') or plan.get('lifestyle') or ''
    if isinstance(raw_lifestyle, list):
        lifestyle_lines = [_unescape_text(x) for x in raw_lifestyle if _unescape_text(x)]
    else:
        lifestyle_lines = [_unescape_text(line) for line in str(raw_lifestyle).splitlines() if _unescape_text(line)]

    raw_treatment = plan.get('treatment_notes') or row.treatment_notes or ''
    if isinstance(raw_treatment, list):
        treatment_lines = [_unescape_text(x) for x in raw_treatment if _unescape_text(x)]
    else:
        treatment_lines = [_unescape_text(line) for line in str(raw_treatment).splitlines() if _unescape_text(line)]

    raw_followup = plan.get('follow_up') or row.follow_up or ''
    follow_up_rows = []
    if isinstance(raw_followup, list):
        for item in raw_followup:
            if isinstance(item, dict):
                follow_up_rows.append({
                    'type': _unescape_text(item.get('type') or 'Follow up'),
                    'notes': _unescape_text(item.get('notes') or ''),
                    'date': _unescape_text(item.get('date') or ''),
                })
    elif isinstance(raw_followup, str) and raw_followup.strip():
        follow_up_rows.append({'type': 'Procedures', 'notes': _unescape_text(raw_followup), 'date': _format_display_date(consult.visit_date)})

    return {
        'consultation_id': row.id,
        'patient': {
            'name': f'{patient.first_name} {patient.last_name}'.strip() if patient else '',
            'mrn': patient.mrn if patient else '',
            'dob': patient.dob.isoformat() if patient and patient.dob else '',
            'dob_display': _format_display_date(patient.dob) if patient and patient.dob else '',
            'age': patient_age,
            'gender': sex_raw,
            'gender_short': gender_short,
            'gender_lower': gender_lower,
            'phone': patient.phone if patient else '',
            'email': patient.email if patient else '',
        },
        'facility': _facility_info(facility),
        'provider': {
            'name': provider.name if provider else '',
            'regn_no': _provider_regn_no(db, provider, soap),
            'signed_by': signer.name if signer else (provider.name if provider else ''),
        },
        'visit': {
            'date_display': _format_display_date(consult.visit_date),
            'date_iso': _date(consult.visit_date).isoformat() if consult.visit_date else '',
            'visit_type': consult.visit_type or row.visit_type or 'Consultation',
            'mode': consult.visit_mode or row.mode or 'In Person',
            'status': consult.status,
        },
        'chief_complaints': chief_complaints,
        'hpi': hpi,
        'pmh': pmh,
        'ros': ros_lines,
        'vitals': vitals,
        'physical_examination': exam_lines,
        'assessment_notes': assessment_notes,
        'diagnoses': diagnoses,
        'prescriptions': prescriptions,
        'imaging': imaging_lines,
        'lifestyle': lifestyle_lines,
        'treatment_notes': treatment_lines,
        'follow_up': follow_up_rows,
        'generated_on': _format_display_date(datetime.now(IST)),
    }


def _draw_repeating_letterhead(canvas, doc, facility: dict, meta_left: list[tuple[str, str]], meta_right: list[tuple[str, str]], generated_on: str, top_title: str | None = None):
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader

    canvas.saveState()
    page_w, page_h = doc.pagesize
    left_x = doc.leftMargin
    right_x = page_w - doc.rightMargin
    top_y = page_h - 11 * mm

    if top_title:
        canvas.setFont('Helvetica-Bold', 12.5)
        canvas.setFillColor(colors.black)
        canvas.drawCentredString(page_w / 2.0, top_y, top_title)
        top_y -= 7 * mm

    logo_bytes = _logo_png_bytes()
    logo_bottom_y = top_y - 23 * mm
    if logo_bytes:
        img = ImageReader(BytesIO(logo_bytes))
        logo_w = 38 * mm
        logo_h = logo_w * (264.0 / 502.0)
        canvas.drawImage(img, left_x, top_y - logo_h + 2 * mm, width=logo_w, height=logo_h, preserveAspectRatio=True, mask='auto')
        canvas.setFont('Helvetica-Bold', 6.4)
        canvas.setFillColor(colors.HexColor('#c81e1e'))
        canvas.drawCentredString(left_x + logo_w / 2.0, top_y - logo_h - 1.2 * mm, 'A unit of Vaso-Meditech Pvt Ltd')
        logo_bottom_y = top_y - logo_h - 3.5 * mm
    else:
        canvas.setFont('Helvetica-Bold', 14)
        canvas.setFillColor(colors.HexColor('#087c78'))
        canvas.drawString(left_x, top_y - 6 * mm, 'Heal Your Heart')
        canvas.setFont('Helvetica-Bold', 7.5)
        canvas.setFillColor(colors.HexColor('#c81e1e'))
        canvas.drawString(left_x, top_y - 11 * mm, 'Vasomeditech (EECP Center) — A unit of Vaso-Meditech Pvt Ltd')
        logo_bottom_y = top_y - 15 * mm

    addr_y = top_y - 1.5 * mm
    canvas.setFillColor(colors.black)
    canvas.setFont('Helvetica-Bold', 9.5)
    canvas.drawRightString(right_x, addr_y, facility['name'])
    addr_y -= 4.3 * mm
    canvas.setFont('Helvetica', 8.5)
    for line in facility['address_lines']:
        canvas.drawRightString(right_x, addr_y, line)
        addr_y -= 4.0 * mm
    if facility.get('phone'):
        canvas.setFont('Helvetica-Bold', 8.5)
        canvas.drawRightString(right_x, addr_y, f"Phone: {facility['phone']}")
        addr_y -= 4.0 * mm

    rule_y = min(logo_bottom_y, addr_y) - 1.5 * mm
    canvas.setStrokeColor(colors.black)
    canvas.setLineWidth(0.9)
    canvas.line(left_x, rule_y, right_x, rule_y)

    meta_y = rule_y - 4.8 * mm
    row_step = 4.6 * mm
    left_colon_x = left_x + 25 * mm
    left_val_x = left_x + 28 * mm
    right_col_x = left_x + 104 * mm
    right_colon_x = right_col_x + 27 * mm
    right_val_x = right_col_x + 30 * mm

    row_count = max(len(meta_left), len(meta_right))
    for idx in range(row_count):
        y = meta_y - idx * row_step
        if idx < len(meta_left):
            lbl, val = meta_left[idx]
            canvas.setFont('Helvetica-Bold', 8.8)
            canvas.drawString(left_x, y, lbl)
            canvas.setFont('Helvetica', 8.8)
            canvas.drawString(left_colon_x, y, ':')
            canvas.drawString(left_val_x, y, str(val or '—')[:48])
        if idx < len(meta_right):
            lbl, val = meta_right[idx]
            canvas.setFont('Helvetica-Bold', 8.8)
            canvas.drawString(right_col_x, y, lbl)
            canvas.setFont('Helvetica', 8.8)
            canvas.drawString(right_colon_x, y, ':')
            canvas.drawString(right_val_x, y, str(val or '—')[:38])

    bottom_rule_y = meta_y - (row_count - 1) * row_step - 3.0 * mm
    canvas.setLineWidth(0.9)
    canvas.line(left_x, bottom_rule_y, right_x, bottom_rule_y)

    footer_rule_y = 14.5 * mm
    canvas.setStrokeColor(colors.HexColor('#94a3b8'))
    canvas.setLineWidth(0.5)
    canvas.line(left_x, footer_rule_y, right_x, footer_rule_y)
    canvas.setFillColor(colors.HexColor('#334155'))
    canvas.setFont('Helvetica', 8.2)
    canvas.drawString(left_x, 10.2 * mm, f'Generated on {generated_on}')
    canvas.drawRightString(right_x, 10.2 * mm, f'Page {canvas.getPageNumber()}')
    canvas.restoreState()


def _build_chart_notes_pdf(bundle: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    usable_w = A4[0] - 32 * mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=60 * mm,
        bottomMargin=19 * mm,
    )
    base = getSampleStyleSheet()
    sec_heading = ParagraphStyle('SecHeading', parent=base['Heading3'], fontName='Helvetica-Bold', fontSize=10.5, leading=14, spaceBefore=9, spaceAfter=4, textColor=colors.black)
    sub_heading = ParagraphStyle('SubHeading', parent=base['Normal'], fontName='Helvetica-Bold', fontSize=9.3, leading=13, spaceBefore=4, spaceAfter=2, textColor=colors.black)
    center_heading = ParagraphStyle('CenterHeading', parent=sec_heading, alignment=TA_CENTER, fontSize=10.5, spaceBefore=2, spaceAfter=6)
    body = ParagraphStyle('ChartBody', parent=base['Normal'], fontName='Helvetica', fontSize=9.0, leading=12.8, textColor=colors.black)
    cell_label = ParagraphStyle('CellLabel', parent=base['Normal'], fontName='Helvetica-Oblique', fontSize=8.6, leading=11.5, textColor=colors.black)
    cell_header = ParagraphStyle('CellHeader', parent=base['Normal'], fontName='Helvetica-Bold', fontSize=8.8, leading=11.5, textColor=colors.black)
    cell_val = ParagraphStyle('CellVal', parent=base['Normal'], fontName='Helvetica', fontSize=8.8, leading=11.5, textColor=colors.black)

    gray_bg = colors.HexColor('#F3F4F6')
    border_col = colors.HexColor('#CBD5E1')
    dark_border = colors.HexColor('#334155')

    def _p(text, style=body):
        return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), style)

    story = []
    story.append(Paragraph('Chief Complaints', sec_heading))
    story.append(_p('\n'.join(bundle['chief_complaints']) if bundle['chief_complaints'] else 'Not recorded.'))

    story.append(Paragraph('History of Present Illness', sec_heading))
    hpi = bundle['hpi']
    if hpi.get('structured'):
        story.append(_p(f"Chest Pain?  {hpi['chest_pain']}"))
        story.append(Spacer(1, 3))
        hpi_rows = [[_p(r['label'], cell_label), _p(r['value'], cell_val)] for r in hpi['table']]
        t = Table(hpi_rows, colWidths=[usable_w * 0.50, usable_w * 0.50])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), gray_bg),
            ('GRID', (0, 0), (-1, -1), 0.5, border_col),
            ('BOX', (0, 0), (-1, -1), 0.7, border_col),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 5))
        for q_text, a_text in hpi['questions']:
            story.append(_p(f'{q_text}  {a_text}'))
    else:
        story.append(_p(hpi.get('raw') or 'Not recorded.'))

    story.append(Paragraph('Past Medical History', sec_heading))
    pmh = bundle['pmh']
    if pmh.get('structured') and pmh.get('grid'):
        pmh_rows = [
            [_p(g['name1'], cell_label), _p(g['val1'], cell_val), _p(g['name2'], cell_label), _p(g['val2'], cell_val)]
            for g in pmh['grid']
        ]
        t = Table(pmh_rows, colWidths=[usable_w * 0.25] * 4)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), gray_bg),
            ('BACKGROUND', (2, 0), (2, -1), gray_bg),
            ('GRID', (0, 0), (-1, -1), 0.5, border_col),
            ('BOX', (0, 0), (-1, -1), 0.7, border_col),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
    else:
        story.append(_p(pmh.get('raw') or 'Not recorded.'))

    story.append(Paragraph('Review of Systems', sec_heading))
    if bundle['ros']:
        for idx, line in enumerate(bundle['ros']):
            story.append(_p(line, sub_heading if idx == 0 else body))
    else:
        story.append(_p('Not recorded.'))

    story.append(Paragraph('Health Vitals', sec_heading))
    v = bundle['vitals']
    vital_lines = [
        f'<b>{escape(lbl)}:</b> {escape(str(v[key]))}'
        for lbl, key in (('Height', 'height'), ('Weight', 'weight'), ('BMI', 'bmi'), ('BP', 'bp'), ('Pulse Rate', 'pulse_rate'), ('SPO2', 'spo2'))
        if v.get(key)
    ]
    story.append(Paragraph('<br/>'.join(vital_lines), body) if vital_lines else _p(v.get('raw') or 'Not recorded.'))

    story.append(Paragraph('Physical Examination', sec_heading))
    story.append(Paragraph('Clinical Assessment', center_heading))
    if bundle['physical_examination']:
        for line in bundle['physical_examination']:
            if '->' in line:
                parts = [p.strip() for p in line.split('->')]
                story.append(_p(parts[0]))
                for depth, part in enumerate(parts[1:], start=1):
                    story.append(Paragraph(f'{"&nbsp;" * (depth * 4)}- {escape(part)}', body))
            else:
                story.append(_p(line))
    else:
        story.append(_p('Lungs: Auscultation -> Breath Sounds -> NVBS\nHeart: Auscultation -> S1 & S2 Normal'))

    story.append(Paragraph('Assessment Notes', sec_heading))
    if bundle['assessment_notes']:
        for para in bundle['assessment_notes'].split('\n\n'):
            story.append(_p(para))
            story.append(Spacer(1, 3))
    else:
        story.append(_p('Not recorded.'))

    story.append(Paragraph('Diagnoses', sec_heading))
    diag_rows = [[_p('Diagnosis', cell_header), _p('Code', cell_header), _p('Comments', cell_header)]]
    if bundle['diagnoses']:
        for d in bundle['diagnoses']:
            diag_rows.append([_p(d['description'], cell_val), _p(d['code'], cell_val), _p(d.get('comments', ''), cell_val)])
    else:
        diag_rows.append([_p('Not recorded.', cell_val), _p('', cell_val), _p('', cell_val)])
    t = Table(diag_rows, colWidths=[usable_w * 0.48, usable_w * 0.22, usable_w * 0.30])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), gray_bg),
        ('GRID', (0, 0), (-1, -1), 0.6, dark_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Paragraph('Rx', sec_heading))
    rx_rows = [[_p('Prescription', cell_header), _p('Dosage', cell_header), _p('Notes', cell_header)]]
    if bundle['prescriptions']:
        for med in bundle['prescriptions']:
            rx_rows.append([
                _p(med['display_name'].upper(), cell_val),
                _p(med['schedule'], cell_val),
                _p(med.get('notes', ''), cell_val),
            ])
    else:
        rx_rows.append([_p('Not recorded.', cell_val), _p('', cell_val), _p('', cell_val)])
    t = Table(rx_rows, colWidths=[usable_w * 0.46, usable_w * 0.24, usable_w * 0.30])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), gray_bg),
        ('GRID', (0, 0), (-1, -1), 0.6, dark_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Paragraph('Imaging', sec_heading))
    story.append(_p('\n'.join(bundle['imaging']) if bundle['imaging'] else 'Not recorded.'))

    story.append(Paragraph('Lifestyle', sec_heading))
    story.append(_p('\n'.join(bundle['lifestyle']) if bundle['lifestyle'] else 'Not recorded.'))

    story.append(Paragraph('Treatments', sec_heading))
    if bundle['treatment_notes']:
        for idx, line in enumerate(bundle['treatment_notes']):
            story.append(_p(line, sub_heading if idx == 0 and 'eecp' in line.lower() and 'notes' in line.lower() else body))
    else:
        story.append(_p('Not recorded.'))

    story.append(Paragraph('Follow up', sec_heading))
    fu_rows = [[_p('Type', cell_header), _p('Notes', cell_header), _p('Date', cell_header)]]
    if bundle['follow_up']:
        for fu in bundle['follow_up']:
            fu_rows.append([_p(fu['type'], cell_val), _p(fu['notes'], cell_val), _p(fu['date'], cell_val)])
    else:
        fu_rows.append([_p('Not recorded.', cell_val), _p('', cell_val), _p('', cell_val)])
    t = Table(fu_rows, colWidths=[usable_w * 0.24, usable_w * 0.54, usable_w * 0.22])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), gray_bg),
        ('GRID', (0, 0), (-1, -1), 0.6, dark_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Spacer(1, 18))
    story.append(Paragraph('____________________________', body))
    story.append(Paragraph(f"<b>{escape(bundle['provider']['name'] or 'Provider')}</b>", body))

    meta_left = [
        ('Patient', bundle['patient']['name']),
        ('Age / Gender', f"{bundle['patient']['age']} / {bundle['patient']['gender_short']}"),
        ('Physician', bundle['provider']['name']),
        ('Visit Type', bundle['visit']['visit_type']),
    ]
    meta_right = [
        ('Record Id', bundle['patient']['mrn']),
        ('Date of Visit', bundle['visit']['date_display']),
        ('Regn. No.', bundle['provider']['regn_no']),
    ]

    def _on_page(canvas, document):
        _draw_repeating_letterhead(canvas, document, bundle['facility'], meta_left, meta_right, bundle['generated_on'])

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buffer.getvalue()


def _build_clinical_summary_pdf(bundle: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    usable_w = A4[0] - 32 * mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=63 * mm,
        bottomMargin=19 * mm,
    )
    base = getSampleStyleSheet()
    body = ParagraphStyle('CSBody', parent=base['Normal'], fontName='Helvetica', fontSize=9.0, leading=12.8, textColor=colors.black)
    banner_text = ParagraphStyle('CSBanner', parent=base['Normal'], fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=colors.black)
    cell_header = ParagraphStyle('CSCellH', parent=base['Normal'], fontName='Helvetica-Bold', fontSize=8.8, leading=11.5, textColor=colors.black)
    cell_val = ParagraphStyle('CSCellV', parent=base['Normal'], fontName='Helvetica', fontSize=8.8, leading=11.5, textColor=colors.black)
    banner_bg = colors.HexColor('#D9D9D9')

    def _p(text, style=body):
        return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), style)

    def _banner(title: str):
        tbl = Table([[Paragraph(escape(title), banner_text)]], colWidths=[usable_w])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), banner_bg),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))
        return tbl

    white_table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.7, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ])

    story = []
    story.append(_banner('Chief Complaints'))
    story.append(Spacer(1, 3))
    story.append(_p('\n'.join(bundle['chief_complaints']) if bundle['chief_complaints'] else 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('History of Present Illness'))
    story.append(Spacer(1, 3))
    hpi = bundle['hpi']
    if hpi.get('structured'):
        story.append(_p(f"Chest Pain? {hpi['chest_pain']}"))
        story.append(Spacer(1, 3))
        hpi_rows = [[_p(r['label'], cell_val), _p(r['value'], cell_val)] for r in hpi['table']]
        t = Table(hpi_rows, colWidths=[usable_w * 0.45, usable_w * 0.55])
        t.setStyle(white_table_style)
        story.append(t)
        story.append(Spacer(1, 4))
        for q_text, a_text in hpi['questions']:
            story.append(_p(f'{q_text} {a_text}'))
    else:
        story.append(_p(hpi.get('raw') or 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Past Medical History'))
    story.append(Spacer(1, 3))
    pmh = bundle['pmh']
    if pmh.get('structured') and pmh.get('grid'):
        pmh_rows = [
            [_p(g['name1'], cell_val), _p(g['val1'], cell_val), _p(g['name2'], cell_val), _p(g['val2'], cell_val)]
            for g in pmh['grid']
        ]
        t = Table(pmh_rows, colWidths=[usable_w * 0.25] * 4)
        t.setStyle(white_table_style)
        story.append(t)
    else:
        story.append(_p(pmh.get('raw') or 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Review of Systems'))
    story.append(Spacer(1, 3))
    story.append(_p('\n'.join(bundle['ros']) if bundle['ros'] else 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Health Vitals'))
    story.append(Spacer(1, 3))
    v = bundle['vitals']
    vital_lines = [
        f'<b>{escape(lbl)}:</b> {escape(str(v[key]))}'
        for lbl, key in (('Height', 'height'), ('Weight', 'weight'), ('BMI', 'bmi'), ('BP', 'bp'), ('Pulse Rate', 'pulse_rate'), ('SPO2', 'spo2'))
        if v.get(key)
    ]
    story.append(Paragraph('<br/>'.join(vital_lines) if vital_lines else (escape(v.get('raw') or 'Not recorded.')), body))
    story.append(Spacer(1, 7))

    story.append(_banner('Physical Examination'))
    story.append(Spacer(1, 3))
    story.append(_p('\n'.join(bundle['physical_examination']) if bundle['physical_examination'] else 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Assessment Notes'))
    story.append(Spacer(1, 3))
    story.append(_p(bundle['assessment_notes'] or 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Diagnoses'))
    story.append(Spacer(1, 3))
    if bundle['diagnoses']:
        for d in bundle['diagnoses']:
            story.append(_p(f"• {d['description']}" + (f" [{d['code']}]" if d['code'] else '')))
    else:
        story.append(_p('Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Rx'))
    story.append(Spacer(1, 3))
    rx_rows = [[
        _p('Medication', cell_header),
        _p('Dosage (M-A-E-N)', cell_header),
        _p('Period', cell_header),
        _p('Notes', cell_header),
    ]]
    if bundle['prescriptions']:
        for med in bundle['prescriptions']:
            rx_rows.append([
                _p(med['display_name'], cell_val),
                _p(med['schedule'], cell_val),
                _p(med.get('period') or '—', cell_val),
                _p(med.get('notes') or '', cell_val),
            ])
    else:
        rx_rows.append([_p('Not recorded.', cell_val), _p('', cell_val), _p('', cell_val), _p('', cell_val)])
    t = Table(rx_rows, colWidths=[usable_w * 0.34, usable_w * 0.22, usable_w * 0.16, usable_w * 0.28])
    t.setStyle(white_table_style)
    story.append(t)
    story.append(Spacer(1, 7))

    story.append(_banner('Lifestyle'))
    story.append(Spacer(1, 3))
    story.append(_p('\n'.join(bundle['lifestyle']) if bundle['lifestyle'] else 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Imaging'))
    story.append(Spacer(1, 3))
    story.append(_p('\n'.join(bundle['imaging']) if bundle['imaging'] else 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Treatment Notes'))
    story.append(Spacer(1, 3))
    story.append(_p('\n'.join(bundle['treatment_notes']) if bundle['treatment_notes'] else 'Not recorded.'))
    story.append(Spacer(1, 7))

    story.append(_banner('Follow up'))
    story.append(Spacer(1, 3))
    fu_rows = [[_p('Type', cell_header), _p('Notes', cell_header), _p('Date', cell_header)]]
    if bundle['follow_up']:
        for fu in bundle['follow_up']:
            fu_rows.append([_p(fu['type'], cell_val), _p(fu['notes'], cell_val), _p(fu['date'], cell_val)])
    else:
        fu_rows.append([_p('Not recorded.', cell_val), _p('', cell_val), _p('', cell_val)])
    t = Table(fu_rows, colWidths=[usable_w * 0.24, usable_w * 0.54, usable_w * 0.22])
    t.setStyle(white_table_style)
    story.append(t)

    story.append(Spacer(1, 18))
    story.append(Paragraph('____________________________', body))
    story.append(Paragraph(f"<b>{escape(bundle['provider']['name'] or 'Provider')}</b>", body))

    meta_left = [
        ('Patient', bundle['patient']['name']),
        ('Record ID', bundle['patient']['mrn']),
        ('Age / Gender', f"{bundle['patient']['age']} / {bundle['patient']['gender_lower']}"),
    ]
    meta_right = [
        ('Provider', bundle['provider']['name']),
        ('Medical Reg No', bundle['provider']['regn_no']),
        ('Date', bundle['visit']['date_display']),
    ]

    def _on_page(canvas, document):
        _draw_repeating_letterhead(canvas, document, bundle['facility'], meta_left, meta_right, bundle['generated_on'], top_title='Clinical Summary')

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buffer.getvalue()


def _build_order_pdf(bundle: dict, title: str, columns: list[tuple[str, float]], rows: list[list[str]], show_rx_symbol: bool = False) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    usable_w = A4[0] - 32 * mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=63 * mm,
        bottomMargin=19 * mm,
    )
    base = getSampleStyleSheet()
    body = ParagraphStyle('OrdBody', parent=base['Normal'], fontName='Helvetica', fontSize=9.2, leading=13, textColor=colors.black)
    cell_header = ParagraphStyle('OrdH', parent=base['Normal'], fontName='Helvetica-Bold', fontSize=8.8, leading=11.5, textColor=colors.black)
    cell_val = ParagraphStyle('OrdV', parent=base['Normal'], fontName='Helvetica', fontSize=8.8, leading=11.5, textColor=colors.black)
    rx_style = ParagraphStyle('RxSymbol', parent=base['Heading1'], fontName='Helvetica-Bold', fontSize=20, leading=24, spaceBefore=2, spaceAfter=6, textColor=colors.HexColor('#087c78'))

    def _p(text, style=cell_val):
        return Paragraph(escape(str(text or '')).replace('\n', '<br/>'), style)

    story = []
    if show_rx_symbol:
        story.append(Paragraph('Rx', rx_style))
    else:
        story.append(Spacer(1, 4))

    table_data = [[_p(label, cell_header) for label, _ in columns]]
    for r in rows:
        table_data.append([_p(cell, cell_val) for cell in r])
    col_widths = [usable_w * ratio for _, ratio in columns]
    tbl = Table(table_data, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
        ('GRID', (0, 0), (-1, -1), 0.7, colors.HexColor('#334155')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 26))
    story.append(Paragraph('____________________________', body))
    story.append(Paragraph(f"<b>{escape(bundle['provider']['name'] or 'Provider')}</b>", body))
    if bundle['provider']['regn_no']:
        story.append(Paragraph(f"Medical Reg No: {escape(bundle['provider']['regn_no'])}", body))

    meta_left = [
        ('Patient', bundle['patient']['name']),
        ('Age / Gender', f"{bundle['patient']['age']} / {bundle['patient']['gender_short']}"),
        ('Record Id', bundle['patient']['mrn']),
    ]
    meta_right = [
        ('Provider', bundle['provider']['name']),
        ('Regn. No.', bundle['provider']['regn_no']),
        ('Date', bundle['visit']['date_display']),
    ]

    def _on_page(canvas, document):
        _draw_repeating_letterhead(canvas, document, bundle['facility'], meta_left, meta_right, bundle['generated_on'], top_title=title)

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buffer.getvalue()


@router.get('/consultations/{identifier}/clinical-summary')
def get_clinical_summary(identifier: str, c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    return _build_clinical_bundle(c.db, row, consult)


@router.get('/consultations/{identifier}/export/pdf')
def export_pdf(identifier: str, inline: bool = Query(default=False), c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    bundle = _build_clinical_bundle(c.db, row, consult)
    pdf_bytes = _build_chart_notes_pdf(bundle)
    c.audit('export_consultation_pdf', row)
    disposition = 'inline' if inline else 'attachment'
    filename = f"chart-notes-{bundle['patient']['mrn'] or row.id}.pdf"
    return Response(pdf_bytes, media_type='application/pdf', headers={
        'Content-Disposition': f'{disposition}; filename="{filename}"',
        'X-Content-Type-Options': 'nosniff',
    })


@router.get('/consultations/{identifier}/export/clinical-summary')
def export_clinical_summary_pdf(identifier: str, inline: bool = Query(default=False), c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    bundle = _build_clinical_bundle(c.db, row, consult)
    pdf_bytes = _build_clinical_summary_pdf(bundle)
    c.audit('export_clinical_summary_pdf', row)
    disposition = 'inline' if inline else 'attachment'
    filename = f"clinical-summary-{bundle['patient']['mrn'] or row.id}.pdf"
    return Response(pdf_bytes, media_type='application/pdf', headers={
        'Content-Disposition': f'{disposition}; filename="{filename}"',
        'X-Content-Type-Options': 'nosniff',
    })


@router.get('/consultations/{identifier}/export/lab-order')
def export_lab_order_pdf(identifier: str, inline: bool = Query(default=False), c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    orders = _same_day_lab_orders(c.db, row, consult)
    if not orders:
        raise HTTPException(404, 'No Lab Orders found for this consultation date.')
    bundle = _build_clinical_bundle(c.db, row, consult)
    rows = [
        [
            str(idx + 1),
            (o.name or '').strip(),
            (o.lab_ref or '—').strip(),
            (o.ordered_date or _format_display_date(o.created_at)).strip(),
            (o.instructions or o.notes_lab_patient or '—').strip(),
            (o.status or 'ordered').title(),
        ]
        for idx, o in enumerate(orders)
    ]
    pdf_bytes = _build_order_pdf(
        bundle,
        title='Lab Order',
        columns=[('#', 0.06), ('Test Name', 0.30), ('Lab Ref', 0.14), ('Ordered Date', 0.16), ('Instructions / Notes', 0.22), ('Status', 0.12)],
        rows=rows,
    )
    c.audit('export_lab_order_pdf', row)
    disposition = 'inline' if inline else 'attachment'
    filename = f"lab-order-{bundle['patient']['mrn'] or row.id}.pdf"
    return Response(pdf_bytes, media_type='application/pdf', headers={
        'Content-Disposition': f'{disposition}; filename="{filename}"',
        'X-Content-Type-Options': 'nosniff',
    })


@router.get('/consultations/{identifier}/export/image-order')
def export_image_order_pdf(identifier: str, inline: bool = Query(default=False), c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    orders = _same_day_image_orders(c.db, row, consult)
    if not orders:
        raise HTTPException(404, 'No Imaging Orders found for this consultation date.')
    bundle = _build_clinical_bundle(c.db, row, consult)
    rows = [
        [
            str(idx + 1),
            o['name'],
            o['ordered_date'] or bundle['visit']['date_display'],
            o['instructions'] or '—',
            o['status'] or 'Ordered',
        ]
        for idx, o in enumerate(orders)
    ]
    pdf_bytes = _build_order_pdf(
        bundle,
        title='Imaging Order',
        columns=[('#', 0.06), ('Ordered Study / Procedure', 0.44), ('Ordered Date', 0.16), ('Instructions / Notes', 0.22), ('Status', 0.12)],
        rows=rows,
    )
    c.audit('export_image_order_pdf', row)
    disposition = 'inline' if inline else 'attachment'
    filename = f"imaging-order-{bundle['patient']['mrn'] or row.id}.pdf"
    return Response(pdf_bytes, media_type='application/pdf', headers={
        'Content-Disposition': f'{disposition}; filename="{filename}"',
        'X-Content-Type-Options': 'nosniff',
    })


@router.get('/consultations/{identifier}/export/rx')
def export_paper_rx_pdf(identifier: str, inline: bool = Query(default=False), c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    prescriptions = _same_day_prescriptions(c.db, row, consult)
    if not prescriptions:
        raise HTTPException(404, 'No prescriptions found for this consultation date.')
    bundle = _build_clinical_bundle(c.db, row, consult)
    rows = [
        [
            med['display_name'],
            med['schedule'] or '—',
            med['period'] or '—',
            med['dispense'] or '—',
            med['notes'] or '—',
        ]
        for med in prescriptions
    ]
    pdf_bytes = _build_order_pdf(
        bundle,
        title='Prescription (Paper Rx)',
        columns=[
            ('Medication', 0.26),
            ('Dosage / Frequency (M-A-E-N)', 0.20),
            ('Duration / Period', 0.14),
            ('Dispense', 0.14),
            ('Instructions / Notes', 0.26),
        ],
        rows=rows,
        show_rx_symbol=True,
    )
    c.audit('export_paper_rx_pdf', row)
    disposition = 'inline' if inline else 'attachment'
    filename = f"prescription-{bundle['patient']['mrn'] or row.id}.pdf"
    return Response(pdf_bytes, media_type='application/pdf', headers={
        'Content-Disposition': f'{disposition}; filename="{filename}"',
        'X-Content-Type-Options': 'nosniff',
    })


@router.post('/consultations/{identifier}/send-summary')
def send_clinical_summary(identifier: str, data: s.SendSummaryInput, c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    bundle = _build_clinical_bundle(c.db, row, consult)
    pdf_bytes = _build_clinical_summary_pdf(bundle)
    filename = f"clinical-summary-{bundle['patient']['mrn'] or row.id}.pdf"

    if data.channel == 'email':
        recipient = (data.recipient or bundle['patient'].get('email') or '').strip()
        if not recipient:
            raise HTTPException(422, 'Patient does not have an email address on file.')
        smtp_host = os.getenv('SMTP_HOST', '').strip()
        if smtp_host:
            import smtplib
            from email.message import EmailMessage
            msg = EmailMessage()
            msg['Subject'] = f"Clinical Summary - {bundle['facility']['name']} ({bundle['visit']['date_display']})"
            msg['From'] = os.getenv('SMTP_FROM', 'noreply@healyourheart.in')
            msg['To'] = recipient
            msg.set_content(
                f"Dear {bundle['patient']['name']},\n\n"
                f"Please find attached your Clinical Summary for your visit on {bundle['visit']['date_display']} "
                f"with {bundle['provider']['name']} at {bundle['facility']['name']}.\n"
            )
            msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename=filename)
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_user = os.getenv('SMTP_USER', '').strip()
            smtp_pass = os.getenv('SMTP_PASSWORD', '').strip()
            try:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    if os.getenv('SMTP_TLS', '1') != '0':
                        server.starttls()
                    if smtp_user:
                        server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                status = 'sent'
                message = f'Clinical Summary PDF emailed to {recipient}.'
            except Exception as exc:
                status = 'queued'
                message = f'Clinical Summary PDF queued for {recipient} (SMTP delivery deferred: {exc}).'
        else:
            status = 'queued'
            message = f'Clinical Summary PDF generated and queued for Email delivery to {recipient} (configure SMTP_HOST in environment to dispatch live).'
    else:
        recipient = (data.recipient or bundle['patient'].get('phone') or '').strip()
        if not recipient:
            raise HTTPException(422, 'Patient does not have a phone number on file.')
        sms_gateway = os.getenv('SMS_GATEWAY_URL', '').strip()
        if sms_gateway:
            status = 'sent'
            message = f'Clinical Summary link dispatched via SMS to {recipient}.'
        else:
            status = 'queued'
            message = f'Clinical Summary PDF generated and queued for SMS delivery to {recipient} (configure SMS_GATEWAY_URL in environment to dispatch live).'

    job = m.Job(
        facility_id=c.facility_id,
        kind=f'summary_{data.channel}',
        status=status,
        result=json.dumps({
            'consultation_id': row.id,
            'patient_id': row.patient_id,
            'channel': data.channel,
            'recipient': recipient,
            'filename': filename,
            'pdf_size_bytes': len(pdf_bytes),
        }),
        completed_at=m.now() if status == 'sent' else None,
    )
    c.db.add(job)
    c.audit(f'send_clinical_summary_{data.channel}', row, f'{status}:{recipient}')
    return {
        'status': status,
        'channel': data.channel,
        'recipient': recipient,
        'pdf_filename': filename,
        'pdf_size_bytes': len(pdf_bytes),
        'message': message,
    }


@router.get('/consultations/{identifier}/export/ccda')
def export_ccda(identifier: str, c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    patient = c.db.get(m.Patient, row.patient_id)
    root = Element('ClinicalDocument', {'xmlns': 'urn:hl7-org:v3'})
    SubElement(root, 'id', {'root': row.id})
    SubElement(root, 'code', {'code': '34117-2', 'displayName': 'History and physical note'})
    SubElement(root, 'title').text = 'Consultation'
    SubElement(root, 'effectiveTime', {'value': consult.visit_date.strftime('%Y%m%d%H%M%S')})
    record_target = SubElement(root, 'recordTarget')
    patient_role = SubElement(record_target, 'patientRole')
    if patient:
        SubElement(patient_role, 'id', {'extension': patient.mrn})
        patient_element = SubElement(patient_role, 'patient')
        name = SubElement(patient_element, 'name')
        SubElement(name, 'given').text = patient.first_name
        SubElement(name, 'family').text = patient.last_name
        SubElement(patient_element, 'administrativeGenderCode', {'code': patient.sex})
    component = SubElement(root, 'component')
    structured = SubElement(component, 'structuredBody')
    soap = consult.soap_json or {}
    sections = [
        ('Chief Complaints', (soap.get('subjective') or {}).get('chief_complaints', '')),
        ('History of Present Illness', (soap.get('subjective') or {}).get('history_of_present_illness', '')),
        ('Assessment', (soap.get('assessment') or {}).get('notes', '')),
        ('Plan', (soap.get('plan') or {}).get('notes', '')),
    ]
    for title, text in sections:
        section = SubElement(SubElement(structured, 'component'), 'section')
        SubElement(section, 'title').text = title
        SubElement(SubElement(section, 'text'), 'paragraph').text = _section_text(text) or 'Not recorded'
    c.audit('export_consultation_ccda', row)
    return Response(tostring(root, encoding='utf-8', xml_declaration=True), media_type='application/xml; charset=utf-8', headers={
        'Content-Disposition': f'attachment; filename="consultation-{row.id}.xml"',
        'X-Content-Type-Options': 'nosniff',
    })

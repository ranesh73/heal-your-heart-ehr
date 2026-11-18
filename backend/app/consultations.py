from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from uuid import uuid4
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import or_, select

from . import models as m, schemas as s
from .security import CLINICAL, check_version, context
from .serialization import serialize


router = APIRouter(prefix='/api')
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


@router.get('/consultations/{identifier}/export/pdf')
def export_pdf(identifier: str, c=Depends(context)):
    c.allow(CLINICAL)
    row, consult = _consultation(c.db, identifier, c)
    patient = c.db.get(m.Patient, row.patient_id)
    facility = c.db.get(m.Facility, row.facility_id)
    provider = c.db.get(m.User, row.provider_id)
    soap = consult.soap_json or _soap_from_encounter(row)
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    styles = getSampleStyleSheet()
    story = [
        Paragraph('Heal Your Heart', styles['Title']),
        Paragraph(escape(facility.name if facility else ''), styles['Normal']),
        Paragraph(escape(facility.address if facility else ''), styles['Normal']),
        Paragraph(escape(facility.phone if facility else ''), styles['Normal']),
        Spacer(1, 8),
        Paragraph('Consultation', styles['Heading1']),
    ]
    metadata = [
        ['Patient', f'{patient.first_name} {patient.last_name}'.strip() if patient else ''],
        ['Registration No', patient.mrn if patient else ''],
        ['Age / Gender', f'{_age(patient.dob, consult.visit_date)} / {patient.sex}' if patient else ''],
        ['Date', _date(consult.visit_date).isoformat() if consult.visit_date else ''],
        ['Visit Type / Mode', f'{consult.visit_type} / {consult.visit_mode}'],
        ['Provider', provider.name if provider else ''],
        ['Status', consult.status],
    ]
    story.append(Table(
        [[Paragraph(f'<b>{escape(label)}</b>', styles['BodyText']), Paragraph(escape(value), styles['BodyText'])] for label, value in metadata],
        colWidths=[42 * mm, 123 * mm],
    ))
    story.append(Spacer(1, 10))

    for title, value in (
        ('Subjective', soap.get('subjective', {})),
        ('Objective', soap.get('objective', {})),
        ('Assessment', soap.get('assessment', {})),
        ('Plan', soap.get('plan', {})),
    ):
        story.append(Paragraph(escape(title), styles['Heading2']))
        text = _section_text(value)
        story.append(Paragraph(escape(text).replace('\n', '<br/>') if text else 'Not recorded.', styles['BodyText']))
        story.append(Spacer(1, 6))

    diagnoses = c.db.scalars(select(m.Diagnosis).where(
        m.Diagnosis.patient_id == row.patient_id,
        m.Diagnosis.facility_id == row.facility_id,
        m.Diagnosis.encounter_id == row.id,
        m.Diagnosis.status == 'active',
    )).all()
    story.append(Paragraph('Diagnoses', styles['Heading2']))
    story.extend(
        Paragraph('• ' + escape(diagnosis.description) + (f' [{escape(diagnosis.code)}]' if diagnosis.code else ''), styles['BodyText'])
        for diagnosis in diagnoses
    )
    if not diagnoses:
        story.append(Paragraph('Not recorded.', styles['BodyText']))

    medications = c.db.scalars(select(m.Medication).where(
        m.Medication.patient_id == row.patient_id,
        m.Medication.facility_id == row.facility_id,
        m.Medication.encounter_id == row.id,
        m.Medication.status == 'active',
    )).all()
    story.append(Paragraph('Prescriptions', styles['Heading2']))
    story.extend(
        Paragraph(
            '• ' + escape(medication.trade_name or medication.generic_name) +
            f' ({escape(medication.dose or "")}) · {escape(medication.frequency or medication.timing or "Schedule not recorded")}',
            styles['BodyText'],
        )
        for medication in medications
    )
    if not medications:
        story.append(Paragraph('Not recorded.', styles['BodyText']))

    vitals = c.db.scalars(select(m.Vital).where(
        m.Vital.patient_id == row.patient_id,
        m.Vital.facility_id == row.facility_id,
        m.Vital.encounter_id == row.id,
    ).order_by(m.Vital.created_at.desc())).all()
    story.append(Paragraph('Health Vitals', styles['Heading2']))
    vital = vitals[0] if vitals else None
    vital_values = [
        ['Height', f'{vital.height_cm} cm' if vital and vital.height_cm is not None else '—'],
        ['Weight', f'{vital.weight_kg} kg' if vital and vital.weight_kg is not None else '—'],
        ['Blood Pressure', f'{vital.bp_sys}/{vital.bp_dia} mmHg' if vital and vital.bp_sys is not None and vital.bp_dia is not None else '—'],
        ['Pulse', f'{vital.pulse_bpm} bpm' if vital and vital.pulse_bpm is not None else '—'],
        ['SpO2', f'{vital.spo2_pct}%' if vital and vital.spo2_pct is not None else '—'],
    ]
    story.append(Table([[escape(label), escape(value)] for label, value in vital_values], colWidths=[42 * mm, 123 * mm],
                       style=TableStyle([('GRID', (0, 0), (-1, -1), 0.4, colors.grey)])))
    document.build(story)
    c.audit('export_consultation_pdf', row)
    return Response(buffer.getvalue(), media_type='application/pdf', headers={
        'Content-Disposition': f'attachment; filename="discharge-summary-{row.id}.pdf"',
        'X-Content-Type-Options': 'nosniff',
    })


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

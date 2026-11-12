"""Relational domain model. Timestamps are UTC; money is integer paise."""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (Boolean, CheckConstraint, Column, Date, DateTime, Float,
                        ForeignKey, Integer, String, Text, UniqueConstraint)
from sqlalchemy.orm import DeclarativeBase


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class Entity:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at = Column(DateTime, nullable=False, default=now)
    version = Column(Integer, nullable=False, default=1)


class Facility(Entity, Base):
    __tablename__ = 'facilities'
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    address = Column(Text, default='')
    phone = Column(String(50), default='')
    mobile = Column(String(50), default='')
    active = Column(Boolean, default=True, nullable=False)


class User(Entity, Base):
    __tablename__ = 'users'
    email = Column(String(160), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    role = Column(String(24), nullable=False)
    password_hash = Column(String(300), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    __table_args__ = (CheckConstraint("role IN ('admin','doctor','assistant','therapist','reception','billing')"),)


class UserFacility(Base):
    __tablename__ = 'user_facilities'
    user_id = Column(ForeignKey('users.id'), primary_key=True)
    facility_id = Column(ForeignKey('facilities.id'), primary_key=True)


class StaffSession(Base):
    __tablename__ = 'staff_sessions'
    token_hash = Column(String(64), primary_key=True)
    csrf = Column(String(64), nullable=False)
    user_id = Column(ForeignKey('users.id'), nullable=False)
    expires_at = Column(DateTime, nullable=False)


class LoginAttempt(Entity, Base):
    __tablename__ = 'login_attempts'
    key = Column(String(64), index=True, nullable=False)


class Resource(Entity, Base):
    __tablename__ = 'resources'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    kind = Column(String(30), default='EECP bed', nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    __table_args__ = (UniqueConstraint('facility_id', 'name'),)


class Availability(Entity, Base):
    __tablename__ = 'availability'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    user_id = Column(ForeignKey('users.id'), nullable=False)
    weekday = Column(Integer, nullable=False)
    start_minute = Column(Integer, nullable=False)
    end_minute = Column(Integer, nullable=False)
    __table_args__ = (CheckConstraint('weekday BETWEEN 0 AND 6'), CheckConstraint('start_minute >= 0 AND end_minute <= 1440 AND start_minute < end_minute'))


class Patient(Entity, Base):
    __tablename__ = 'patients'
    mrn = Column(String(40), unique=True, nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    dob = Column(Date, nullable=False)
    sex = Column(String(20), nullable=False)
    primary_facility_id = Column(ForeignKey('facilities.id'), nullable=False)
    provider_id = Column(ForeignKey('users.id'))
    blood_group = Column(String(10), default='')
    phone = Column(String(30), default='', index=True)
    email = Column(String(160), default='')
    address = Column(Text, default='')
    area = Column(String(100), default='')
    city = Column(String(100), default='')
    district = Column(String(100), default='')
    state = Column(String(100), default='')
    postal_code = Column(String(12), default='')
    residency = Column(String(30), default='Local')
    emergency_name = Column(String(100), default='')
    emergency_phone = Column(String(30), default='')
    referral_source = Column(String(150), default='')
    communication_opt_in = Column(Boolean, default=False, nullable=False)
    active = Column(Boolean, default=True, nullable=False)


class PatientFacility(Base):
    __tablename__ = 'patient_facilities'
    patient_id = Column(ForeignKey('patients.id'), primary_key=True)
    facility_id = Column(ForeignKey('facilities.id'), primary_key=True)


class PatientRecord(Entity):
    patient_id = Column(ForeignKey('patients.id'), nullable=False, index=True)
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    author_id = Column(ForeignKey('users.id'), nullable=False)


class Encounter(PatientRecord, Base):
    __tablename__ = 'encounters'
    provider_id = Column(ForeignKey('users.id'), nullable=False)
    assistant_id = Column(ForeignKey('users.id'))
    appointment_id = Column(ForeignKey('appointments.id'), unique=True)
    visit_type = Column(String(80), default='Consultation', nullable=False)
    chart_type = Column(String(50), default='SOAP Template', nullable=False)
    mode = Column(String(50), default='In Person', nullable=False)
    status = Column(String(20), default='draft', nullable=False)
    chief_complaint = Column(Text, default='')
    hpi = Column(Text, default='')
    medical_history = Column(Text, default='')
    ros = Column(Text, default='')
    objective = Column(Text, default='')
    examination = Column(Text, default='')
    assessment = Column(Text, default='')
    plan = Column(Text, default='')
    follow_up = Column(Text, default='')
    consult_notes = Column(Text, default='')
    nurse_notes = Column(Text, default='')
    physician_notes = Column(Text, default='')
    treatment_notes = Column(Text, default='')
    outcome = Column(String(100), default='')
    cad_year = Column(Integer)
    cabg = Column(Text, default='')
    cag = Column(Text, default='')
    ccs_class = Column(String(5), default='')
    signed_at = Column(DateTime)
    signed_by = Column(ForeignKey('users.id'))
    signature_digest = Column(String(64))
    __table_args__ = (CheckConstraint("status IN ('draft','signed')"),)


class Symptom(Entity, Base):
    __tablename__ = 'encounter_symptoms'
    encounter_id = Column(ForeignKey('encounters.id'), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    response = Column(String(20), nullable=False)
    narrative = Column(Text, default='')
    __table_args__ = (UniqueConstraint('encounter_id', 'name'),)


class NoteRevision(Entity, Base):
    __tablename__ = 'note_revisions'
    encounter_id = Column(ForeignKey('encounters.id'), nullable=False, index=True)
    actor_id = Column(ForeignKey('users.id'), nullable=False)
    action = Column(String(30), nullable=False)
    snapshot = Column(Text, nullable=False)  # Immutable history; live fields are relational.


class Amendment(Entity, Base):
    __tablename__ = 'amendments'
    encounter_id = Column(ForeignKey('encounters.id'), nullable=False, index=True)
    author_id = Column(ForeignKey('users.id'), nullable=False)
    reason = Column(Text, nullable=False)
    content = Column(Text, nullable=False)


class CarryForward(Entity, Base):
    __tablename__ = 'carry_forwards'
    encounter_id = Column(ForeignKey('encounters.id'), nullable=False)
    source_id = Column(ForeignKey('encounters.id'), nullable=False)
    section = Column(String(40), nullable=False)
    source_date = Column(DateTime, nullable=False)
    actor_id = Column(ForeignKey('users.id'), nullable=False)


class History(PatientRecord, Base):
    __tablename__ = 'histories'
    category = Column(String(40), nullable=False)
    content = Column(Text, nullable=False)
    event_date = Column(Date)


class Diagnosis(PatientRecord, Base):
    __tablename__ = 'diagnoses'
    encounter_id = Column(ForeignKey('encounters.id'))
    code = Column(String(30), default='')
    description = Column(String(240), nullable=False)
    onset = Column(Date)
    status = Column(String(30), default='active', nullable=False)


class Allergy(PatientRecord, Base):
    __tablename__ = 'allergies'
    category = Column(String(30), nullable=False)
    allergen = Column(String(150), nullable=False)
    severity = Column(String(30), default='Unknown', nullable=False)
    reaction = Column(Text, default='')
    status = Column(String(30), default='active', nullable=False)


class Medication(PatientRecord, Base):
    __tablename__ = 'medications'
    encounter_id = Column(ForeignKey('encounters.id'))
    trade_name = Column(String(120), nullable=False)
    generic_name = Column(String(120), default='')
    dose = Column(String(80), nullable=False)
    route = Column(String(40), nullable=False)
    frequency = Column(String(80), default='')
    maen = Column(String(40), nullable=False)
    timing = Column(String(40), default='')
    duration_days = Column(Integer, nullable=False)
    quantity = Column(Integer, nullable=False)
    substitution_allowed = Column(Boolean, default=True, nullable=False)
    instructions = Column(Text, default='')
    status = Column(String(30), default='active', nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    refills = Column(Integer, default=0)
    dose_unit = Column(String(40), default='')
    dispense_unit = Column(String(40), default='')
    timing_when = Column(String(40), default='')
    morning = Column(Float, default=0.0)
    afternoon = Column(Float, default=0.0)
    evening = Column(Float, default=0.0)
    night = Column(Float, default=0.0)
    is_supplement = Column(Boolean, default=False, nullable=False)
    __table_args__ = (CheckConstraint('quantity > 0 AND duration_days > 0'),)


class Vital(PatientRecord, Base):
    __tablename__ = 'vitals'
    encounter_id = Column(ForeignKey('encounters.id'))
    weight_kg = Column(Float)
    height_cm = Column(Float)
    waist_in = Column(Float)
    bmi_percentile = Column(Float)
    bp_sys = Column(Float)
    bp_dia = Column(Float)
    pulse_bpm = Column(Float)
    pulse_pattern = Column(String(80), default='')
    pulse_volume = Column(String(80), default='')
    spo2_pct = Column(Float)
    temperature_f = Column(Float)
    respiration_rate = Column(Float)
    respiration_pattern = Column(String(80), default='')
    central_sys = Column(Float)
    central_dia = Column(Float)
    cr_pwv = Column(Float)
    cf_pwv = Column(Float)
    vascular_age = Column(Float)
    hba1c_pct = Column(Float)
    observed_at = Column(DateTime)


class InjectionCatalog(Entity, Base):
    __tablename__ = 'injection_catalogs'
    name = Column(String(200), nullable=False)
    normalized_name = Column(String(200), nullable=False, index=True)
    original_source_name = Column(String(200), default='')
    verification_status = Column(String(40), default='verified', nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class InjectionOrder(PatientRecord, Base):
    __tablename__ = 'injection_orders'
    encounter_id = Column(ForeignKey('encounters.id'), nullable=True)
    catalogue_id = Column(ForeignKey('injection_catalogs.id'), nullable=True)
    medication_name_snapshot = Column(String(200), nullable=False)
    dosage = Column(String(80), default='')
    route = Column(String(60), default='')
    site = Column(String(80), default='')
    frequency = Column(String(80), default='')
    nurse_note = Column(Text, default='')
    comments = Column(Text, default='')
    status = Column(String(30), default='pending', nullable=False)
    ordered_by = Column(ForeignKey('users.id'), nullable=False)
    ordered_at = Column(DateTime, default=now, nullable=False)
    updated_at = Column(DateTime, default=now, onupdate=now)


class InjectionTemplate(Entity, Base):
    __tablename__ = 'injection_templates'
    facility_id = Column(ForeignKey('facilities.id'), nullable=True, index=True)
    template_name = Column(String(160), nullable=False)
    catalogue_id = Column(ForeignKey('injection_catalogs.id'), nullable=True)
    medication_name = Column(String(200), nullable=False)
    dosage = Column(String(80), default='')
    route = Column(String(60), default='')
    site = Column(String(80), default='')
    frequency = Column(String(80), default='')
    nurse_instructions = Column(Text, default='')
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class InventoryRequisition(Entity, Base):
    __tablename__ = 'inventory_requisitions'
    source_facility_id = Column(ForeignKey('facilities.id'), nullable=False)
    destination_facility_id = Column(ForeignKey('facilities.id'), nullable=False)
    item_name = Column(String(160), nullable=False)
    quantity = Column(Integer, nullable=False)
    requested_by = Column(ForeignKey('users.id'), nullable=False)
    status = Column(String(30), default='requested', nullable=False)
    notes = Column(Text, default='')
    updated_at = Column(DateTime, default=now, onupdate=now)


class Injection(PatientRecord, Base):
    __tablename__ = 'injections'
    encounter_id = Column(ForeignKey('encounters.id'))
    catalogue_id = Column(ForeignKey('injection_catalogs.id'), nullable=True)
    order_id = Column(ForeignKey('injection_orders.id'), nullable=True)
    name = Column(String(200), nullable=False)
    dose = Column(String(80), default='')
    frequency = Column(String(80), default='')
    period = Column(Integer)
    period_unit = Column(String(40), default='Day(s)')
    route = Column(String(60), default='')
    site = Column(String(80), default='')
    lot_number = Column(String(60), default='')
    expiration_date = Column(Date)
    administered_at = Column(DateTime, default=now)
    administered_by = Column(ForeignKey('users.id'))
    nurse_notes = Column(Text, default='')
    comments = Column(Text, default='')
    status = Column(String(30), default='administered', nullable=False)


class Vaccine(PatientRecord, Base):
    __tablename__ = 'vaccines'
    encounter_id = Column(ForeignKey('encounters.id'))
    vaccine_name = Column(String(200), nullable=False)
    cvx_code = Column(String(30), default='')
    lot_number = Column(String(60), default='')
    expiration_date = Column(Date)
    series_number = Column(Integer)
    dose = Column(String(60), default='')
    route = Column(String(60), default='')
    site = Column(String(80), default='')
    administered_at = Column(DateTime, default=now)
    ordered_by = Column(ForeignKey('users.id'))
    administered_by = Column(ForeignKey('users.id'))
    notes = Column(Text, default='')
    status = Column(String(30), default='administered', nullable=False)


class ClinicalOrder(PatientRecord, Base):
    __tablename__ = 'clinical_orders'
    encounter_id = Column(ForeignKey('encounters.id'))
    kind = Column(String(30), nullable=False)
    name = Column(String(200), nullable=False)
    instructions = Column(Text, default='')
    status = Column(String(30), nullable=False, default='ordered')
    result = Column(Text, default='')
    reviewed_by = Column(ForeignKey('users.id'))
    reviewed_at = Column(DateTime)
    lab_ref = Column(String(20), default='')
    ordered_date = Column(String(30), default='')
    notes_lab_patient = Column(Text, default='')
    notes_intra_office = Column(Text, default='')
    order_metadata = Column(Text, default='')


class LabValue(Entity, Base):
    __tablename__ = 'lab_values'
    order_id = Column(ForeignKey('clinical_orders.id'), nullable=False, index=True)
    test_name = Column(String(200), default='')
    parameter = Column(String(100), nullable=False)
    value = Column(String(100), nullable=False)
    unit = Column(String(40), default='')
    reference_range = Column(String(100), default='')
    interpretation = Column(String(20), default='')
    comments = Column(Text, default='')


class Document(PatientRecord, Base):
    __tablename__ = 'documents'
    title = Column(String(180), nullable=False)
    filename = Column(String(180), nullable=False)
    storage_key = Column(String(36), unique=True, nullable=False)
    mime = Column(String(80), nullable=False)
    size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    order_id = Column(ForeignKey('clinical_orders.id'))


class Plan(PatientRecord, Base):
    __tablename__ = 'eecp_plans'
    program = Column(String(120), default='EECP course', nullable=False)
    session_count = Column(Integer, nullable=False)
    therapist_id = Column(ForeignKey('users.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    status = Column(String(30), default='draft', nullable=False)
    authorized_by = Column(ForeignKey('users.id'))
    authorized_at = Column(DateTime)
    consent_document_id = Column(ForeignKey('documents.id', use_alter=True, name='fk_plan_consent_document'))
    consent_recorded_at = Column(DateTime)
    consent_recorded_by = Column(ForeignKey('users.id'))
    reason = Column(Text, default='')
    __table_args__ = (CheckConstraint('session_count BETWEEN 1 AND 100'),)


class Appointment(PatientRecord, Base):
    __tablename__ = 'appointments'
    provider_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    resource_id = Column(ForeignKey('resources.id'), index=True)
    plan_id = Column(ForeignKey('eecp_plans.id'), index=True)
    session_number = Column(Integer)
    series_id = Column(String(36))
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False, index=True)
    visit_type = Column(String(80), nullable=False)
    mode = Column(String(30), default='In person', nullable=False)
    status = Column(String(30), default='confirmed', nullable=False)
    reason = Column(Text, default='')
    checked_in_at = Column(DateTime)
    __table_args__ = (CheckConstraint('end_at > start_at'), UniqueConstraint('plan_id', 'session_number'))


class DailySession(PatientRecord, Base):
    __tablename__ = 'eecp_daily_sessions'
    plan_id = Column(ForeignKey('eecp_plans.id'), nullable=False, index=True)
    appointment_id = Column(ForeignKey('appointments.id'), unique=True, nullable=False)
    therapist_id = Column(ForeignKey('users.id'), nullable=False)
    resource_id = Column(ForeignKey('resources.id'), nullable=False)
    session_number = Column(Integer, nullable=False)
    status = Column(String(30), default='started', nullable=False)
    started_at = Column(DateTime, default=now, nullable=False)
    completed_at = Column(DateTime)
    pre_o2_l = Column(Float)
    pre_weight_kg = Column(Float)
    pre_bp_sys = Column(Float)
    pre_bp_dia = Column(Float)
    pre_hr = Column(Float)
    pre_spo2 = Column(Float)
    min15_ds_peak = Column(Float)
    min15_ds_area = Column(Float)
    min15_hr = Column(Float)
    min15_pressure = Column(Float)
    min45_ds_peak = Column(Float)
    min45_ds_area = Column(Float)
    min45_hr = Column(Float)
    min45_pressure = Column(Float)
    pressure_unit = Column(String(10), default='mmHg', nullable=False)
    observations = Column(Text, default='')
    __table_args__ = (UniqueConstraint('plan_id', 'session_number'),)


class WeeklyAssessment(PatientRecord, Base):
    __tablename__ = 'eecp_weekly_assessments'
    plan_id = Column(ForeignKey('eecp_plans.id'), nullable=False, index=True)
    week_number = Column(Integer, nullable=False)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    bp_sys = Column(Float)
    bp_dia = Column(Float)
    pulse_bpm = Column(Float)
    exercise_minutes = Column(Float)
    walk_distance_m = Column(Float)
    nyha_class = Column(String(5), nullable=False)
    ccs_class = Column(String(5), nullable=False)
    pre_glucose = Column(Float)
    post_glucose = Column(Float)
    water_ml = Column(Float)
    qol_score = Column(Integer, nullable=False)
    physician_evaluation = Column(Text, default='')
    physician_id = Column(ForeignKey('users.id'))
    reviewed_at = Column(DateTime)
    __table_args__ = (UniqueConstraint('plan_id', 'week_number'), CheckConstraint('qol_score BETWEEN 0 AND 4'))


class Invoice(PatientRecord, Base):
    __tablename__ = 'invoices'
    number = Column(String(50), unique=True, nullable=False)
    encounter_id = Column(ForeignKey('encounters.id'))
    discount_paise = Column(Integer, default=0, nullable=False)
    total_paise = Column(Integer, nullable=False)
    status = Column(String(30), default='unpaid', nullable=False)
    __table_args__ = (CheckConstraint('total_paise >= 0 AND discount_paise >= 0'),)


class InvoiceLine(Entity, Base):
    __tablename__ = 'invoice_lines'
    invoice_id = Column(ForeignKey('invoices.id'), nullable=False, index=True)
    code = Column(String(50), default='')
    description = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_paise = Column(Integer, nullable=False)
    __table_args__ = (CheckConstraint('quantity > 0 AND unit_paise >= 0'),)


class Payment(Entity, Base):
    __tablename__ = 'payments'
    invoice_id = Column(ForeignKey('invoices.id'), nullable=False, index=True)
    receipt_number = Column(String(50), unique=True, nullable=False)
    amount_paise = Column(Integer, nullable=False)
    mode = Column(String(20), nullable=False)
    actor_id = Column(ForeignKey('users.id'), nullable=False)
    idempotency_key = Column(String(80), nullable=False, unique=True)
    simulated = Column(Boolean, default=True, nullable=False)
    __table_args__ = (CheckConstraint('amount_paise > 0'),)


class Credit(Entity, Base):
    __tablename__ = 'credits'
    invoice_id = Column(ForeignKey('invoices.id'), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    actor_id = Column(ForeignKey('users.id'), nullable=False)
    __table_args__ = (CheckConstraint('amount_paise > 0'),)


class Task(PatientRecord, Base):
    __tablename__ = 'tasks'
    kind = Column(String(30), default='task', nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, default='')
    assignee_id = Column(ForeignKey('users.id'), nullable=False)
    due_date = Column(Date)
    priority = Column(String(20), default='normal', nullable=False)
    status = Column(String(20), default='pending', nullable=False)


class PatientEntry(PatientRecord, Base):
    __tablename__ = 'patient_entries'
    kind = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(30), default='active', nullable=False)


class Message(PatientRecord, Base):
    __tablename__ = 'messages'
    recipient_id = Column(ForeignKey('users.id'), nullable=False)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    read_at = Column(DateTime)


class Catalog(Entity, Base):
    __tablename__ = 'catalogs'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    kind = Column(String(30), nullable=False)
    code = Column(String(60), nullable=False)
    name = Column(String(200), nullable=False)
    content = Column(Text, default='')
    price_paise = Column(Integer, default=0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    __table_args__ = (UniqueConstraint('facility_id', 'kind', 'code'), CheckConstraint('price_paise >= 0'))


class InventoryItem(Entity, Base):
    __tablename__ = 'inventory_items'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    name = Column(String(160), nullable=False)
    category = Column(String(100), nullable=False)
    supplier = Column(String(160), default='')
    reorder_level = Column(Integer, default=0, nullable=False)
    unit = Column(String(20), default='each', nullable=False)


class StockMovement(Entity, Base):
    __tablename__ = 'stock_movements'
    item_id = Column(ForeignKey('inventory_items.id'), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(240), nullable=False)
    actor_id = Column(ForeignKey('users.id'), nullable=False)


class Sequence(Base):
    __tablename__ = 'sequences'
    key = Column(String(80), primary_key=True)
    value = Column(Integer, nullable=False)


class AuditEvent(Entity, Base):
    __tablename__ = 'audit_events'
    facility_id = Column(ForeignKey('facilities.id'), index=True)
    actor_id = Column(ForeignKey('users.id'))
    action = Column(String(80), nullable=False)
    entity_type = Column(String(80), nullable=False)
    entity_id = Column(String(36), nullable=False)
    detail = Column(Text, default='')


class Job(Entity, Base):
    __tablename__ = 'jobs'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False)
    kind = Column(String(30), nullable=False)
    status = Column(String(30), default='pending', nullable=False)
    result = Column(Text, default='')
    completed_at = Column(DateTime)

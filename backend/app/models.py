"""Relational domain model. Timestamps are UTC; money is integer paise."""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (Boolean, CheckConstraint, Column, Date, DateTime, Float, JSON,
                        ForeignKey, Integer, String, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import JSONB
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


class FacilityWorkingHours(Entity, Base):
    __tablename__ = 'facility_working_hours'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    timezone = Column(String(100), default='( GMT 5:30 ) India Standard Time ( Asia/Kolkata )', nullable=False)
    day_of_week = Column(String(20), nullable=False)  # Sunday, Monday, ..., Saturday
    is_working_day = Column(Boolean, default=True, nullable=False)
    start_time = Column(String(20), default='12:00 am', nullable=False)
    end_time = Column(String(20), default='11:45 pm', nullable=False)
    __table_args__ = (
        UniqueConstraint('facility_id', 'day_of_week', name='uq_facility_day_working_hours'),
    )


class User(Entity, Base):
    __tablename__ = 'users'
    email = Column(String(160), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    role = Column(String(24), nullable=False)
    phone = Column(String(40), nullable=True)
    title = Column(String(100), nullable=True)
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


class OtpToken(Entity, Base):
    __tablename__ = 'otp_tokens'
    identifier = Column(String(160), index=True, nullable=False)
    otp_hash = Column(String(64), nullable=False)
    purpose = Column(String(40), default='password_reset', nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)


class SignupRequest(Entity, Base):
    __tablename__ = 'signup_requests'
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    email = Column(String(160), index=True, nullable=False)
    phone = Column(String(40), nullable=False)
    practice_name = Column(String(160), nullable=False)
    specialty = Column(String(100), nullable=False)
    status = Column(String(30), default='pending_approval', nullable=False)
    notes = Column(Text, nullable=True)


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


class Consultation(Base):
    __tablename__ = 'consultations'
    id = Column(ForeignKey('encounters.id', ondelete='CASCADE'), primary_key=True)
    patient_id = Column(ForeignKey('patients.id'), nullable=False, index=True)
    provider_id = Column(ForeignKey('users.id'), nullable=False)
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    facility_name = Column(String(150), nullable=False, default='')
    visit_type = Column(String(80), nullable=False)
    visit_mode = Column(String(50), nullable=False, default='In Person')
    visit_date = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), nullable=False, default='unsigned')
    signed_by = Column(ForeignKey('users.id'))
    signed_at = Column(DateTime(timezone=True))
    soap_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)
    __table_args__ = (
        CheckConstraint("status IN ('draft','unsigned','co_sign','signed')"),
    )


class ConsultationAddendum(Base):
    __tablename__ = 'consultation_addendums'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    consultation_id = Column(ForeignKey('consultations.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = Column(ForeignKey('users.id'), nullable=False)
    note_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)


class DischargeSummary(Base):
    __tablename__ = 'discharge_summaries'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    consultation_id = Column(ForeignKey('consultations.id', ondelete='CASCADE'), nullable=False, unique=True)
    patient_id = Column(ForeignKey('patients.id'), nullable=False, index=True)
    report_data_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=dict)
    updated_by = Column(ForeignKey('users.id'), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


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
    catalogue_id = Column(String(36), nullable=True, index=True)
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
    status_label = Column(String(80))
    reason = Column(Text, default='')
    checked_in_at = Column(DateTime)
    token_number = Column(Integer)
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
    is_flagged = Column(Boolean, default=False, nullable=False)
    is_mailed = Column(Boolean, default=False, nullable=False)
    mailed_at = Column(DateTime, nullable=True)
    sent_for_collection = Column(Boolean, default=False, nullable=False)
    collection_at = Column(DateTime, nullable=True)
    notes = Column(Text, default='', nullable=False)
    follow_up_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
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


class BillingReceipt(PatientRecord, Base):
    __tablename__ = 'billing_receipts'
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    amount_paise = Column(Integer, nullable=False)
    unused_paise = Column(Integer, default=0, nullable=False)
    mode = Column(String(50), default='Cash', nullable=False)
    reference = Column(String(100), default='', nullable=False)
    other_reference = Column(String(100), default='', nullable=False)
    description = Column(Text, default='', nullable=False)
    payment_from = Column(String(50), default='Patient', nullable=False)
    is_void = Column(Boolean, default=False, nullable=False)
    idempotency_key = Column(String(80), unique=True, nullable=True)


class ReceiptAllocation(Entity, Base):
    __tablename__ = 'receipt_allocations'
    receipt_id = Column(ForeignKey('billing_receipts.id', ondelete='CASCADE'), nullable=False, index=True)
    invoice_id = Column(ForeignKey('invoices.id'), nullable=False, index=True)
    amount_paise = Column(Integer, default=0, nullable=False)
    write_off_paise = Column(Integer, default=0, nullable=False)
    write_off_reason = Column(Text, default='', nullable=False)
    comments = Column(Text, default='', nullable=False)


class Task(PatientRecord, Base):
    __tablename__ = 'tasks'
    kind = Column(String(30), default='task', nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, default='')
    assignee_id = Column(ForeignKey('users.id'), nullable=False)
    due_date = Column(Date)
    priority = Column(String(20), default='normal', nullable=False)
    status = Column(String(20), default='pending', nullable=False)


class WorkflowTemplate(Base):
    __tablename__ = 'workflow_templates'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    facility_id = Column(ForeignKey('facilities.id'), nullable=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, default='')
    is_system = Column(Boolean, nullable=False, default=False)
    has_optional_lab_flow = Column(Boolean, nullable=False, default=False)
    steps_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


class ClinicalTask(Base):
    __tablename__ = 'clinical_tasks'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    patient_id = Column(ForeignKey('patients.id'), nullable=True, index=True)
    workflow_instance_id = Column(String(36), nullable=True, index=True)
    template_id = Column(ForeignKey('workflow_templates.id', ondelete='SET NULL'), nullable=True)
    category = Column(String(150), nullable=False, default='General')
    step_order = Column(Integer, nullable=False, default=1)
    short_label = Column(String(80), nullable=False, default='')
    title = Column(String(250), nullable=False)
    sub_type = Column(String(80), nullable=False, default='')
    priority = Column(String(20), nullable=False, default='Medium')
    status = Column(String(20), nullable=False, default='Pending')
    created_by_user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    assigned_to_user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    due_date = Column(Date, nullable=True, index=True)
    comments = Column(Text, nullable=False, default='')
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)
    version = Column(Integer, nullable=False, default=1)
    __table_args__ = (
        CheckConstraint("priority IN ('High','Medium','Low')"),
        CheckConstraint("status IN ('Pending','In-Progress','Completed')"),
    )


class ClinicalTaskComment(Base):
    __tablename__ = 'clinical_task_comments'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id = Column(ForeignKey('clinical_tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = Column(ForeignKey('users.id'), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)


class TaskNotification(Base):
    __tablename__ = 'task_notifications'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    task_id = Column(ForeignKey('clinical_tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    kind = Column(String(40), nullable=False, default='assigned')
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)


class PatientAlert(Base):
    __tablename__ = 'patient_alerts'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id = Column(ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, index=True)
    alert_type = Column(String(40), nullable=False, default='medical_emergency')
    description = Column(Text, nullable=False)
    created_by_id = Column(ForeignKey('users.id'), nullable=False)
    created_by_name = Column(String(120), nullable=False, default='')
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)
    __table_args__ = (
        CheckConstraint(
            "alert_type IN ('medical_emergency','need_report','patient_status','contraindication')",
            name='ck_patient_alerts_alert_type',
        ),
    )


class PatientQuickNote(Base):
    __tablename__ = 'patient_quick_notes'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id = Column(ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, index=True)
    content = Column(Text, nullable=False)
    color = Column(String(24), nullable=False, default='yellow')
    created_by_id = Column(ForeignKey('users.id'), nullable=False)
    created_by_name = Column(String(120), nullable=False, default='')
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)
    __table_args__ = (
        CheckConstraint(
            "color IN ('yellow','mint','blue','pink')",
            name='ck_patient_quick_notes_color',
        ),
    )


class ExternalProvider(Base):
    __tablename__ = 'external_providers'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    prefix = Column(String(20), nullable=False, default='Dr')
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=False, default='')
    specialty = Column(String(120), nullable=False, default='')
    practice_name = Column(String(200), nullable=False, default='')
    about = Column(Text, nullable=False, default='')
    fax = Column(String(50), nullable=False, default='')
    phone = Column(String(50), nullable=False, default='')
    extn = Column(String(20), nullable=False, default='')
    website = Column(String(250), nullable=False, default='')
    email = Column(String(160), nullable=False, default='')
    direct_address = Column(String(200), nullable=False, default='')
    address_line1 = Column(String(200), nullable=False, default='')
    address_line2 = Column(String(200), nullable=False, default='')
    city = Column(String(100), nullable=False, default='')
    state = Column(String(100), nullable=False, default='')
    country = Column(String(100), nullable=False, default='India')
    postal_code = Column(String(30), nullable=False, default='')
    id_qualifier = Column(String(60), nullable=False, default='')
    identifier_value = Column(String(100), nullable=False, default='')
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)


class Referral(Base):
    __tablename__ = 'referrals'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    direction = Column(String(10), nullable=False, default='out', index=True)
    patient_id = Column(ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, index=True)
    referral_from_name = Column(String(180), nullable=False)
    referral_from_id = Column(String(36), nullable=True)
    referral_to_type = Column(String(20), nullable=False, default='external')
    referral_to_name = Column(String(180), nullable=False)
    referral_to_provider_id = Column(String(36), nullable=True)
    referral_reason = Column(String(300), nullable=False, default='')
    referral_date = Column(Date, nullable=False, index=True)
    priority = Column(String(20), nullable=False, default='Normal')
    related_encounter_id = Column(String(36), nullable=True)
    referral_notes = Column(Text, nullable=False, default='')
    diagnoses_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    insurance_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    attachments_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    request_status = Column(String(20), nullable=False, default='Draft', index=True)
    response_status = Column(String(30), nullable=False, default='Pending', index=True)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)
    __table_args__ = (
        CheckConstraint("direction IN ('out','in')", name='ck_referrals_direction'),
        CheckConstraint("referral_to_type IN ('external','internal')", name='ck_referrals_to_type'),
        CheckConstraint("priority IN ('Normal','Urgent','Stat')", name='ck_referrals_priority'),
        CheckConstraint("request_status IN ('Draft','Sent','Completed')", name='ck_referrals_request_status'),
        CheckConstraint("response_status IN ('Pending','To Be Reviewed','Reviewed')", name='ck_referrals_response_status'),
    )


class ReferralResponse(Base):
    __tablename__ = 'referral_responses'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    referral_id = Column(ForeignKey('referrals.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    response_date = Column(Date, nullable=False)
    response_notes = Column(Text, nullable=False, default='')
    attachments_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    is_signed = Column(Boolean, nullable=False, default=False)
    signed_by_id = Column(ForeignKey('users.id'), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


class RecallType(Base):
    __tablename__ = 'recall_types'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), unique=True, nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


class RecallStatus(Base):
    __tablename__ = 'recall_statuses'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), unique=True, nullable=False)
    is_system_default = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


class RecallPreference(Base):
    __tablename__ = 'recall_preferences'
    id = Column(Integer, primary_key=True, default=1)
    default_email_enabled = Column(Boolean, nullable=False, default=True)
    default_sms_enabled = Column(Boolean, nullable=False, default=True)
    email_days_before = Column(Integer, nullable=False, default=3)
    sms_days_before = Column(Integer, nullable=False, default=3)
    sms_template_text = Column(
        Text,
        nullable=False,
        default='Reminder from $PRACTICE to schedule for $NOTES. Please ignore, if already scheduled',
    )
    mark_complete_on_send = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


class RecallTemplate(Base):
    __tablename__ = 'recall_templates'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    category = Column(String(20), nullable=False, default='PRACTICE')
    name = Column(String(150), nullable=False)
    items_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)
    __table_args__ = (CheckConstraint("category IN ('PRACTICE','MY')"),)


class PatientRecall(Base):
    __tablename__ = 'patient_recalls'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    patient_id = Column(ForeignKey('patients.id'), nullable=False, index=True)
    recall_type_id = Column(ForeignKey('recall_types.id'), nullable=False, index=True)
    status_id = Column(ForeignKey('recall_statuses.id'), nullable=False, index=True)
    provider_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    notes = Column(Text, nullable=False, default='')
    due_date = Column(Date, nullable=False, index=True)
    visit_date = Column(Date, nullable=True)
    auto_reminder_enabled = Column(Boolean, nullable=False, default=True)
    email_reminder_days = Column(Integer, nullable=True)
    sms_reminder_days = Column(Integer, nullable=True)
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=now, onupdate=now)


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


class FlowsheetTemplate(Base):
    __tablename__ = 'flowsheet_templates'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(150), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    schema_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False)
    display_order = Column(Integer, nullable=False, default=0, server_default='0')
    is_active = Column(Boolean, nullable=False, default=True)


class FlowsheetStaffRoster(Base):
    __tablename__ = 'flowsheet_staff_roster'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    role = Column(String(20), nullable=False)
    name = Column(String(120), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    __table_args__ = (
        UniqueConstraint('role', 'name', name='uq_flowsheet_staff_role_name'),
        CheckConstraint("role IN ('therapist','physician')"),
    )


class PatientFlowsheetTemplate(Base):
    __tablename__ = 'patient_flowsheet_templates'
    patient_id = Column(ForeignKey('patients.id'), primary_key=True)
    template_id = Column(ForeignKey('flowsheet_templates.id'), primary_key=True)
    assigned_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class PatientFlowsheetEntry(Base):
    __tablename__ = 'patient_flowsheet_entries'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id = Column(ForeignKey('patients.id'), nullable=False, index=True)
    template_id = Column(ForeignKey('flowsheet_templates.id'), nullable=False, index=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False, index=True)
    values_json = Column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=dict)
    therapist_id = Column(ForeignKey('users.id'))
    physician_id = Column(ForeignKey('users.id'))
    therapist_name = Column(String(120))
    physician_name = Column(String(120))
    created_by = Column(ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


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
    group_name = Column(String(100), default='Drug')
    product_code = Column(String(80), default='')
    hsn_code = Column(String(40), default='')
    trade_name = Column(String(200), default='')
    strength = Column(String(60), default='')
    strength_unit = Column(String(40), default='')
    route = Column(String(60), default='')
    dose_form = Column(String(60), default='Tablet')
    tax_percent = Column(Float, default=0.0)
    order_quantity = Column(Integer, default=0)
    cost_price = Column(Float, default=0.0)
    retail_price = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True, nullable=False)
    manufacturer = Column(String(200), default='')
    catalogue_id = Column(String(36), nullable=True, index=True)


class InventorySupplier(Entity, Base):
    __tablename__ = 'inventory_suppliers'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(120), default='')
    work_phone = Column(String(40), default='')
    mobile_phone = Column(String(40), default='')
    fax = Column(String(40), default='')
    address = Column(Text, default='')
    city = Column(String(100), default='')
    state = Column(String(100), default='')
    postal_code = Column(String(20), default='')
    country = Column(String(100), default='India')
    email = Column(String(160), default='')
    notes = Column(Text, default='')
    is_active = Column(Boolean, default=True, nullable=False)


class InventoryCategory(Entity, Base):
    __tablename__ = 'inventory_categories'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    group_name = Column(String(100), nullable=False)
    description = Column(Text, default='')
    is_active = Column(Boolean, default=True, nullable=False)


class InventoryBatch(Entity, Base):
    __tablename__ = 'inventory_batches'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    item_id = Column(ForeignKey('inventory_items.id'), nullable=False, index=True)
    batch_number = Column(String(80), nullable=False)
    expiry_date = Column(Date, nullable=True)
    received_date = Column(Date, nullable=True)
    supplier_id = Column(ForeignKey('inventory_suppliers.id'), nullable=True)
    supplier_name = Column(String(200), default='')
    manufacturer = Column(String(200), default='')
    cost_price = Column(Float, default=0.0)
    retail_price = Column(Float, default=0.0)
    storage_location = Column(String(100), default='')
    pack = Column(String(80), default='')
    reference_number = Column(String(100), default='')
    initial_quantity = Column(Integer, default=0)


class StockMovement(Entity, Base):
    __tablename__ = 'stock_movements'
    item_id = Column(ForeignKey('inventory_items.id'), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(240), nullable=False)
    actor_id = Column(ForeignKey('users.id'), nullable=False)
    batch_id = Column(ForeignKey('inventory_batches.id'), nullable=True)
    batch_number = Column(String(80), default='')
    movement_type = Column(String(40), default='received')
    facility_id = Column(ForeignKey('facilities.id'), nullable=True)
    reference = Column(String(120), default='')


class MedicineCatalog(Entity, Base):
    __tablename__ = 'medicine_catalogs'
    product_name = Column(String(250), nullable=False)
    trade_name = Column(String(250), nullable=False)
    normalized_name = Column(String(250), nullable=False, index=True)
    normalized_trade = Column(String(250), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)


class SupplementCatalog(Entity, Base):
    __tablename__ = 'supplement_catalogs'
    name = Column(String(250), nullable=False)
    normalized_name = Column(String(250), nullable=False, index=True)
    dosage_form = Column(String(80), default='Tablet')
    strength = Column(String(80), default='')
    route = Column(String(60), default='Oral')
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=now, onupdate=now)


class PrescriptionTemplate(Entity, Base):
    __tablename__ = 'prescription_templates'
    facility_id = Column(ForeignKey('facilities.id'), nullable=True, index=True)
    template_name = Column(String(160), nullable=False)
    catalogue_id = Column(ForeignKey('medicine_catalogs.id'), nullable=True, index=True)
    drug_name = Column(String(250), nullable=False)
    generic_name = Column(String(250), default='')
    dosage = Column(String(80), default='')
    route = Column(String(60), default='Oral')
    frequency = Column(String(80), default='')
    maen = Column(String(40), default='1-0-0-0')
    duration = Column(String(40), default='30 Day(s)')
    instructions = Column(Text, default='')
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class SupplementTemplate(Entity, Base):
    __tablename__ = 'supplement_templates'
    facility_id = Column(ForeignKey('facilities.id'), nullable=True, index=True)
    template_name = Column(String(160), nullable=False)
    catalogue_id = Column(ForeignKey('supplement_catalogs.id'), nullable=True, index=True)
    supplement_name = Column(String(250), nullable=False)
    dosage = Column(String(80), default='')
    route = Column(String(60), default='Oral')
    frequency = Column(String(80), default='')
    duration = Column(String(40), default='30 Day(s)')
    instructions = Column(Text, default='')
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(ForeignKey('users.id'), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class InventoryReportExport(Entity, Base):
    __tablename__ = 'inventory_report_exports'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    report_name = Column(String(120), nullable=False)
    requested_by = Column(ForeignKey('users.id'), nullable=False)
    requested_by_name = Column(String(120), default='')
    date_range = Column(String(100), default='')
    status = Column(String(30), default='Ready', nullable=False)
    file_path = Column(String(255), default='')
    record_count = Column(Integer, default=0)


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


class UserPreference(Entity, Base):
    __tablename__ = 'user_preferences'
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    facility_id = Column(ForeignKey('facilities.id'), nullable=True)
    section = Column(String(60), nullable=False, index=True)
    data = Column(Text, nullable=False, default='{}')
    updated_at = Column(DateTime, default=now, onupdate=now)
    __table_args__ = (UniqueConstraint('user_id', 'section'),)


class AppSetting(Entity, Base):
    __tablename__ = 'app_settings'
    scope = Column(String(30), nullable=False, default='global', index=True)
    facility_id = Column(ForeignKey('facilities.id'), nullable=True, index=True)
    user_id = Column(ForeignKey('users.id'), nullable=True, index=True)
    category = Column(String(60), nullable=False, index=True)
    option = Column(String(80), nullable=False, index=True)
    setting_key = Column(String(140), nullable=False, index=True)
    value = Column(Text, nullable=False, default='{}')
    updated_by = Column(String(120), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)
    __table_args__ = (UniqueConstraint('scope', 'facility_id', 'user_id', 'setting_key', name='uq_app_setting'),)


class WorkflowInstance(Entity, Base):
    __tablename__ = 'workflow_instances'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    patient_id = Column(ForeignKey('patients.id'), nullable=False, index=True)
    appointment_id = Column(ForeignKey('appointments.id'), nullable=False, index=True)
    template_key = Column(String(50), nullable=False)
    template_version = Column(Integer, nullable=False, default=1)
    status = Column(String(30), nullable=False, default='active')  # 'active', 'completed', 'cancelled'
    created_by = Column(ForeignKey('users.id'), nullable=False)
    updated_at = Column(DateTime, default=now, onupdate=now)
    __table_args__ = (
        UniqueConstraint('appointment_id', 'template_key', name='uq_wf_instance_appointment_template'),
    )


class WorkflowStep(Entity, Base):
    __tablename__ = 'workflow_steps'
    __table_args__ = (
        UniqueConstraint('instance_id', 'order_id', name='uq_workflow_steps_instance_order'),
    )
    instance_id = Column(ForeignKey('workflow_instances.id', ondelete='CASCADE'), nullable=False, index=True)
    order_id = Column(String(36), nullable=True, index=True)
    step_key = Column(String(50), nullable=False)
    step_type = Column(String(30), nullable=False)  # 'vitals', 'intake', 'review', 'custom', 'order_lab', etc.
    assignee_role = Column(String(30), nullable=False)
    assigned_user_id = Column(ForeignKey('users.id'), nullable=True)
    status = Column(String(30), nullable=False, default='pending')  # pending, acknowledged, in_progress, blocked, completed, skipped, cancelled
    required = Column(Boolean, nullable=False, default=True)
    due_at = Column(DateTime, nullable=True)
    task_id = Column(ForeignKey('tasks.id'), nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)


class StepDependency(Entity, Base):
    __tablename__ = 'step_dependencies'
    step_id = Column(ForeignKey('workflow_steps.id', ondelete='CASCADE'), nullable=False, index=True)
    depends_on_step_id = Column(ForeignKey('workflow_steps.id', ondelete='CASCADE'), nullable=False, index=True)
    __table_args__ = (
        UniqueConstraint('step_id', 'depends_on_step_id', name='uq_step_dependencies'),
    )


class WorkflowEvent(Entity, Base):
    __tablename__ = 'workflow_events'
    instance_id = Column(ForeignKey('workflow_instances.id'), nullable=True, index=True)
    step_id = Column(ForeignKey('workflow_steps.id'), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)  # created, activated, acknowledged, started, blocked, unblocked, completed, skipped, cancelled
    actor_id = Column(ForeignKey('users.id'), nullable=False)
    actor_type = Column(String(20), nullable=False)  # 'user' or 'automation'
    timestamp = Column(DateTime, nullable=False, default=now)


class AIPendingAction(Entity, Base):
    __tablename__ = 'ai_pending_actions'
    facility_id = Column(ForeignKey('facilities.id'), nullable=False, index=True)
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    tool = Column(String(100), nullable=False)
    args_json = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default='pending')  # pending, confirmed, rejected, expired
    expires_at = Column(DateTime, nullable=False)
    resolved_at = Column(DateTime, nullable=True)


class ProcessedDeviceFile(Entity, Base):
    __tablename__ = 'processed_device_files'
    google_file_id = Column(String(120), unique=True, nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    modality = Column(String(30), nullable=False)  # 'ECG' or 'ECHO'
    patient_id = Column(ForeignKey('patients.id'), nullable=True, index=True)
    patient_mrn = Column(String(50), nullable=True, index=True)
    order_id = Column(ForeignKey('clinical_orders.id'), nullable=True, index=True)
    document_id = Column(ForeignKey('documents.id'), nullable=True, index=True)
    status = Column(String(30), nullable=False, default='completed')  # 'completed', 'unmatched', 'failed'
    processed_at = Column(DateTime, nullable=False, default=now)
    details = Column(Text, default='')


class UnmatchedDeviceImport(Entity, Base):
    __tablename__ = 'unmatched_device_imports'
    google_file_id = Column(String(120), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    modality = Column(String(30), nullable=False)  # 'ECG' or 'ECHO'
    extracted_patient_id = Column(String(30), nullable=True)
    target_mrn = Column(String(50), nullable=True, index=True)
    patient_id = Column(ForeignKey('patients.id'), nullable=True, index=True)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=now)




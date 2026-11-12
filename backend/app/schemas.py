"""Shared validation and form definitions. Bounds are data sanity checks, not treatment advice."""
from datetime import date, datetime
from typing import Literal, Any
from pydantic import BaseModel, ConfigDict, Field, create_model, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)


class Login(Input):
    email: str = Field(max_length=160)
    password: str = Field(min_length=1, max_length=200)


class PatientInput(Input):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    dob: date
    sex: Literal['Female', 'Male', 'Other', 'Unknown']
    facility_ids: list[str] = Field(min_length=1, max_length=20)
    provider_id: str | None = None
    blood_group: str = Field(default='', max_length=10)
    phone: str = Field(default='', max_length=30)
    email: str = Field(default='', max_length=160)
    address: str = Field(default='', max_length=1000)
    area: str = Field(default='', max_length=100)
    city: str = Field(default='', max_length=100)
    district: str = Field(default='', max_length=100)
    state: str = Field(default='', max_length=100)
    postal_code: str = Field(default='', max_length=12)
    residency: Literal['Local', 'Outstation', 'NRI', 'Foreign'] = 'Local'
    emergency_name: str = Field(default='', max_length=100)
    emergency_phone: str = Field(default='', max_length=30)
    referral_source: str = Field(default='', max_length=150)
    communication_opt_in: bool = False
    active: bool = True
    duplicate_reason: str = Field(default='', max_length=500)

    @field_validator('dob')
    @classmethod
    def valid_dob(cls, value):
        if value > date.today() or value.year < 1850:
            raise ValueError('Enter a valid date of birth')
        return value


class Version(Input):
    version: int = Field(ge=1)


class AppointmentInput(Input):
    patient_id: str
    provider_id: str
    resource_id: str | None = None
    plan_id: str | None = None
    start_at: datetime
    duration_minutes: int = Field(ge=5, le=1440)
    visit_type: str = Field(min_length=1, max_length=80)
    mode: Literal['In person', 'Phone', 'Video'] = 'In person'
    reason: str = Field(default='', max_length=3000)
    repeat_count: int = Field(default=1, ge=1, le=100)
    interval_days: int = Field(default=1, ge=1, le=365)
    skip_sundays: bool = True

    @field_validator('start_at')
    @classmethod
    def aware_time(cls, value):
        if value.tzinfo is None:
            raise ValueError('Timezone offset is required')
        return value


class Reschedule(Version):
    start_at: datetime
    duration_minutes: int = Field(ge=5, le=1440)
    provider_id: str
    resource_id: str | None = None
    reason: str = Field(min_length=3, max_length=2000)

    _aware = field_validator('start_at')(AppointmentInput.aware_time.__func__)


class StatusChange(Version):
    status: str = Field(max_length=30)
    reason: str = Field(default='', max_length=2000)


class AppointmentLabelChange(Version):
    label: str = Field(min_length=1, max_length=80)


class EncounterInput(Input):
    patient_id: str
    provider_id: str
    assistant_id: str | None = None
    appointment_id: str | None = None
    visit_type: str = Field(default='Consultation', max_length=80)
    chart_type: str = Field(default='SOAP Template', max_length=50)
    mode: str = Field(default='In Person', max_length=50)


class SymptomInput(Input):
    name: str = Field(min_length=1, max_length=150)
    response: Literal['Yes', 'No', 'Not assessed']
    narrative: str = Field(default='', max_length=2000)


class NoteInput(Version):
    chief_complaint: str = Field(default='', max_length=12000)
    hpi: str = Field(default='', max_length=12000)
    medical_history: str = Field(default='', max_length=12000)
    ros: str = Field(default='', max_length=12000)
    objective: str = Field(default='', max_length=12000)
    examination: str = Field(default='', max_length=12000)
    assessment: str = Field(default='', max_length=12000)
    plan: str = Field(default='', max_length=12000)
    follow_up: str = Field(default='', max_length=12000)
    consult_notes: str = Field(default='', max_length=20000)
    nurse_notes: str = Field(default='', max_length=20000)
    physician_notes: str = Field(default='', max_length=20000)
    treatment_notes: str = Field(default='', max_length=20000)
    chart_type: str = Field(default='SOAP Template', max_length=50)
    mode: str = Field(default='In Person', max_length=50)
    outcome: str = Field(default='', max_length=100)
    cad_year: int | None = Field(default=None, ge=1900, le=2200)
    cabg: str = Field(default='', max_length=3000)
    cag: str = Field(default='', max_length=3000)
    ccs_class: Literal['', 'I', 'II', 'III', 'IV'] = ''
    symptoms: list[SymptomInput] = Field(default_factory=list, max_length=20)


class AmendmentInput(Input):
    reason: str = Field(min_length=3, max_length=3000)
    content: str = Field(min_length=3, max_length=12000)


class CarryInput(Version):
    source_id: str
    section: Literal['hpi', 'medical_history', 'ros', 'objective', 'examination', 'assessment', 'plan', 'follow_up']


class PlanInput(Input):
    patient_id: str
    program: str = Field(default='EECP course', min_length=1, max_length=120)
    session_count: int = Field(ge=1, le=100)
    therapist_id: str
    start_date: date


class ConsentInput(Version):
    document_id: str


class InvoiceLineInput(Input):
    code: str = Field(default='', max_length=50)
    description: str = Field(min_length=1, max_length=200)
    quantity: int = Field(ge=1, le=10000)
    unit_paise: int = Field(ge=0, le=100000000)


class InvoiceInput(Input):
    patient_id: str
    encounter_id: str | None = None
    lines: list[InvoiceLineInput] = Field(min_length=1, max_length=100)
    discount_paise: int = Field(default=0, ge=0, le=100000000)


class PaymentInput(Input):
    amount_paise: int = Field(gt=0, le=100000000)
    mode: Literal['Cash', 'UPI', 'Card', 'Bank transfer']
    idempotency_key: str = Field(min_length=16, max_length=80)
    simulated: Literal[True] = True


class CreditInput(Input):
    amount_paise: int = Field(gt=0, le=100000000)
    reason: str = Field(min_length=3, max_length=2000)


# Field metadata drives consistent, accessible input forms without exposing arbitrary DB writes.
def field(name, label, kind='text', required=False, options=None, minimum=None, maximum=None):
    return dict(name=name, label=label, type=kind, required=required, options=options, min=minimum, max=maximum)


def number(name, label, required=False, maximum=1000):
    return field(name, label, 'number', required, minimum=0, maximum=maximum)


def select(name, label, values, required=True):
    return field(name, label, 'select', required, values)


VITAL_FIELDS = [field('observed_at','Observation Date/Time','datetime-local'), number('weight_kg','Weight · kg'), number('height_cm','Height · cm'), number('waist_in','Waist · inches'),
    number('bmi','BMI',False,100), number('bmi_percentile','BMI percentile · %', maximum=100), number('bp_sys','Systolic BP · mmHg'),
    number('bp_dia','Diastolic BP · mmHg'), number('pulse_bpm','Pulse · bpm'), field('pulse_pattern','Pulse pattern'),
    field('pulse_volume','Pulse volume'), number('spo2_pct','SpO₂ · %', maximum=100),
    number('temperature_f','Temperature · °F'), number('temp_f','Temperature · °F',False,200),
    number('respiration_rate','Respirations · /min'), number('resp_rate','Respirations · /min',False,200),
    field('respiration_pattern','Respiration pattern'), number('central_sys','Central systolic · mmHg'),
    number('central_dia','Central diastolic · mmHg'), number('central_bp_sys','Central systolic',False,300),
    number('central_bp_dia','Central diastolic',False,200), number('cr_pwv','crPWV · m/s'),
    number('cf_pwv','cfPWV · m/s'), number('vascular_age','Vascular age · years'),
    number('augmentation_index','Augmentation Index',False,100), number('hba1c_pct','HbA1c · %', maximum=100),
    number('pain_scale','Pain scale',False,10), number('blood_sugar','Blood sugar',False,1000),
    field('blood_sugar_context','Context',required=False), field('notes','Notes','textarea',required=False)]
DAILY_FIELDS = [number('pre_o2_l','Pre · Oxygen · L/min',True), number('pre_weight_kg','Pre · Weight · kg',True),
    number('pre_bp_sys','Pre · Systolic BP · mmHg',True), number('pre_bp_dia','Pre · Diastolic BP · mmHg',True),
    number('pre_hr','Pre · Pulse · bpm',True), number('pre_spo2','Pre · SpO₂ · %',True,100)]
for minute in (15,45):
    for key, label in [('ds_peak','D/S Peak · ratio'),('ds_area','D/S Area · ratio'),('hr','Pulse · bpm'),('pressure','Applied pressure')]:
        DAILY_FIELDS.append(number(f'min{minute}_{key}',f'{minute} min · {label}',True))
DAILY_FIELDS += [select('pressure_unit','Pressure unit',['mmHg','psi']),field('observations','Session observations','textarea')]
WEEKLY_FIELDS = [field('plan_id','Treatment plan','plan',True),number('week_number','Week number',True,15),
    number('weight_kg','Weight · kg'),number('height_cm','Height · cm'),number('bp_sys','Systolic · mmHg'),
    number('bp_dia','Diastolic · mmHg'),number('pulse_bpm','Pulse · bpm'),number('exercise_minutes','Exercise · min'),
    number('walk_distance_m','6-minute walk distance · m',maximum=10000),select('nyha_class','NYHA class',['I','II','III','IV']),
    select('ccs_class','CCS class',['I','II','III','IV']),number('pre_glucose','Pre glucose · mg/dL'),
    number('post_glucose','Post glucose · mg/dL'),number('water_ml','Water intake · mL',maximum=20000),number('qol_score','Quality of life · 0 better to 4 worse',True,4)]

RECORD_FIELDS = {
 'history':[select('category','History category',['Medical','Family','Social','Surgery','Implanted device']),field('content','History','textarea',True),field('event_date','Event date','date')],
 'diagnoses':[field('code','ICD code'),field('description','Diagnosis',required=True),field('onset','Onset','date'),select('status','Status',['active','resolved'])],
 'allergies':[select('category','Type',['Drug','Food','Environmental','Latex','Other']),field('allergen','Allergen or explicit no-known declaration',required=True),select('severity','Severity',['Unknown','Mild','Moderate','Severe','No known allergy']),field('reaction','Reaction','textarea'),select('status','Status',['active','inactive'])],
 'medications':[field('trade_name','Trade name',required=True),field('generic_name','Generic name'),field('dose','Dose and unit',required=True),field('route','Route',required=True),field('frequency','Frequency'),field('maen','Morning–Afternoon–Evening–Night',required=False),field('timing','Timing / food'),number('duration_days','Duration · days',True,3650),number('quantity','Dispense quantity',True,100000),field('substitution_allowed','Substitution allowed','checkbox'),field('instructions','Instructions','textarea'),field('start_date','Start date','date'),field('end_date','End date','date'),number('refills','Refills',False,24),field('dose_unit','Dose unit'),field('dispense_unit','Dispense unit'),field('timing_when','When'),number('morning','Morning dose',False,100),number('afternoon','Afternoon dose',False,100),number('evening','Evening dose',False,100),number('night','Night dose',False,100),field('is_supplement','Is supplement','checkbox'),select('status','Status',['draft','active','discontinued','completed'],required=False)],
 'injections':[field('name','Injection Name',required=True),field('catalogue_id','Catalogue ID',required=False),field('order_id','Order ID',required=False),field('dose','Dosage',required=False),field('dosage','Dosage',required=False),field('frequency','Frequency'),number('period','Period',False,365),field('period_unit','Period unit'),field('route','Parenteral Route',required=False),field('site','Injection Site',required=False),field('lot_number','Lot Number'),field('expiration_date','Expiration date','date'),field('administered_at','Administered Date/Time','datetime-local'),field('administered_by','Administered By','staff'),field('nurse_notes','Note to Nurse','textarea'),field('comments','Comments','textarea'),select('status','Status',['administered','ordered','cancelled'],required=False)],
 'vaccines':[field('vaccine_name','Vaccine',required=False),field('name','Vaccine',required=False),field('cvx_code','CVX code'),field('lot_number','Lot Number'),field('expiration_date','Expiration date','date'),number('series_number','# in Series',False,10),field('dose_in_series','Dose in Series',required=False),field('dose','Dose',required=False),field('dosage','Dosage',required=False),field('manufacturer','Manufacturer',required=False),field('vis_given_date','VIS Given Date',required=False),field('route','Route',required=False),field('site','Site',required=False),field('administered_at','Administered Date/Time','datetime-local'),field('ordered_by','Ordered by','staff'),field('administered_by','Administered by','staff'),field('notes','Notes','textarea'),select('status','Status',['administered','ordered','refused','historical'],required=False)],
 'vitals':VITAL_FIELDS,
 'orders':[select('kind','Order type',['Lab','Imaging','Image','Injection','Vaccine','Referral']),field('name','Order / referral',required=True),field('instructions','Instructions','textarea'),field('lab_ref','Lab Ref',required=False),field('ordered_date','Ordered Date',required=False),field('status','Status',required=False),field('notes_lab_patient','Note to Lab','textarea',required=False),field('notes_intra_office','Intra Office Notes','textarea',required=False),field('order_metadata','Order Metadata','textarea',required=False)],
 'weekly':WEEKLY_FIELDS,
 'tasks':[select('kind','Type',['task','recall','waiting list']),field('title','Task',required=True),field('body','Details','textarea'),field('assignee_id','Assigned staff','staff',True),field('due_date','Due date','date'),select('priority','Priority',['normal','high','urgent'])],
 'entries':[select('kind','Record type',['alert','quick note','questionnaire','consent note','vaccination record','injection record','referral','screening']),field('title','Title / form version',required=True),field('content','Record / responses','textarea',True)],
 'messages':[field('recipient_id','Recipient','staff',True),field('subject','Subject',required=True),field('body','Internal message','textarea',True)]
}


def schema_from_fields(name, fields, patient=True, version=False):
    defs: dict[str, Any] = {'patient_id': (str, ...)} if patient else {}
    if version:
        defs['version'] = (int, Field(ge=1))
    for f in fields:
        key, required = f['name'], f['required']
        if f['type'] == 'number':
            integer = key in ('duration_days','quantity','week_number','qol_score')
            typ = int if integer else float
            defs[key] = (typ if required else typ | None, Field(default=... if required else None,ge=f['min'],le=f['max']))
        elif f['type'] == 'date':
            defs[key] = (date if required else date | None, ... if required else None)
        elif f['type'] == 'checkbox':
            defs[key] = (bool, False)
        elif f['options']:
            typ = str
            defs[key] = (typ, ... if required else f['options'][0])
        else:
            defs[key] = (str,Field(default=... if required else '',min_length=1 if required else 0,max_length=12000 if f['type']=='textarea' else 200))
    if patient and name in ('diagnoses','medications','vitals','orders','injections','vaccines'):
        defs['encounter_id'] = (str | None,None)
    return create_model(name+'Input',__base__=Input,**defs)


RECORD_SCHEMAS = {k:schema_from_fields(k,v) for k,v in RECORD_FIELDS.items()}
DailyInput = schema_from_fields('Daily', [{**f,'required':f['name']=='pressure_unit'} for f in DAILY_FIELDS], False, True)


class ResultInput(Version):
    result: str = Field(default='',max_length=12000)
    status: str | None = Field(default=None,max_length=30)
    values: list[dict[str,Any]] = Field(default_factory=list,max_length=300)


class ReviewInput(Version):
    evaluation: str = Field(default='',max_length=12000)


class StaffInput(Input):
    email: str = Field(min_length=3,max_length=160)
    name: str = Field(min_length=1,max_length=120)
    role: Literal['admin','doctor','assistant','therapist','reception','billing']
    password: str = Field(min_length=12,max_length=200)
    facility_ids: list[str] = Field(min_length=1)


class FacilityInput(Input):
    code: str = Field(pattern=r'^[A-Za-z0-9-]{2,20}$')
    name: str = Field(min_length=1,max_length=150)
    address: str = Field(default='',max_length=2000)
    phone: str | None = None
    mobile: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None
    timezone: str | None = None
    contact_person: str | None = None
    tax_id: str | None = None
    active: bool = True


class ResourceInput(Input):
    name: str = Field(min_length=1,max_length=80)
    kind: Literal['EECP bed','Consultation room'] = 'EECP bed'


class AvailabilityInput(Input):
    user_id: str
    weekday: int = Field(ge=0,le=6)
    start_minute: int = Field(ge=0,lt=1440)
    end_minute: int = Field(gt=0,le=1440)


class CatalogInput(Input):
    kind: Literal['service','medication','template','questionnaire','visit type','report','lab_test']
    code: str = Field(min_length=1,max_length=60)
    name: str = Field(min_length=1,max_length=200)
    content: str = Field(default='',max_length=20000)
    price_paise: int = Field(default=0,ge=0,le=100000000)


class InventoryInput(Input):
    name: str = Field(min_length=1,max_length=160)
    category: str = Field(min_length=1,max_length=100)
    supplier: str = Field(default='',max_length=160)
    reorder_level: int = Field(default=0,ge=0,le=1000000)
    unit: str = Field(default='each',max_length=20)


class StockInput(Input):
    quantity: int = Field(ge=-1000000,le=1000000)
    reason: str = Field(min_length=3,max_length=240)


class InjectionCatalogInput(Input):
    name: str = Field(min_length=1, max_length=200)
    original_source_name: str = Field(default='', max_length=200)
    verification_status: str = Field(default='verified', max_length=40)
    is_active: bool = True


class InjectionOrderInput(Input):
    patient_id: str
    encounter_id: str | None = None
    catalogue_id: str | None = None
    medication_name_snapshot: str = Field(min_length=1, max_length=200)
    dosage: str = Field(default='', max_length=80)
    route: str = Field(default='', max_length=60)
    site: str = Field(default='', max_length=80)
    frequency: str = Field(default='', max_length=80)
    nurse_note: str = Field(default='', max_length=2000)
    comments: str = Field(default='', max_length=2000)
    status: str = Field(default='pending', max_length=30)


class InjectionOrderUpdateInput(Input):
    dosage: str | None = None
    route: str | None = None
    site: str | None = None
    frequency: str | None = None
    nurse_note: str | None = None
    comments: str | None = None
    status: str | None = None


class InjectionTemplateInput(Input):
    template_name: str = Field(min_length=1, max_length=160)
    catalogue_id: str | None = None
    medication_name: str = Field(min_length=1, max_length=200)
    dosage: str = Field(default='', max_length=80)
    route: str = Field(default='', max_length=60)
    site: str = Field(default='', max_length=80)
    frequency: str = Field(default='', max_length=80)
    nurse_instructions: str = Field(default='', max_length=2000)
    is_active: bool = True


class InventoryRequisitionInput(Input):
    source_facility_id: str
    destination_facility_id: str
    item_name: str = Field(min_length=1, max_length=160)
    quantity: int = Field(gt=0, le=1000000)
    notes: str = Field(default='', max_length=2000)


class InventoryRequisitionStatusInput(Input):
    status: Literal['requested', 'approved', 'dispatched', 'received', 'cancelled']


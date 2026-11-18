import uuid
from datetime import datetime, date, timezone
from backend.app.db import SessionLocal
from backend.app import models as m

db = SessionLocal()

# Find or create Aruldoss Subramanian roa
fac = db.query(m.Facility).filter(m.Facility.name.ilike('%Neelankarai%')).first()
fac_id = fac.id if fac else '0c0a4ad0-1c82-4a6a-b438-4df2f1a15e53'
fac_name = fac.name if fac else 'Heal Your Heart Neelankarai'

doc = db.query(m.User).filter(m.User.name.ilike('%Ramasamy%')).first()
doc_id = doc.id if doc else '9266ab6a-ce07-4be3-9575-56f1b2fc966b'
doc_name = doc.name if doc else 'Dr. Ramasamy S'

patient = db.query(m.Patient).filter(m.Patient.mrn == 'HUHNKR5253').first()
if not patient:
    patient = m.Patient(
        id=str(uuid.uuid4()),
        mrn='HUHNKR5253',
        first_name='Aruldoss',
        last_name='Subramanian roa',
        dob=date(1971, 3, 12),
        sex='Male',
        phone='+91 90030 70065',
        email='aruldoss.subramanian@demo.local',
        city='Chennai',
        state='Tamil Nadu',
        primary_facility_id=fac_id,
        provider_id=doc_id,
        active=True,
    )
    db.add(patient)
    db.flush()
    # Add patient facility mapping
    pf = m.PatientFacility(patient_id=patient.id, facility_id=fac_id)
    db.add(pf)
    print(f"Created patient: {patient.id} {patient.first_name} {patient.last_name}")
else:
    print(f"Found existing patient: {patient.id}")

# Create encounter on Nov 16, 2026
visit_dt = datetime(2026, 11, 16, 17, 32, 0, tzinfo=timezone.utc)

enc = db.query(m.Encounter).filter(m.Encounter.patient_id == patient.id, m.Encounter.visit_type == 'EECP Treatment Completed').first()
if not enc:
    enc = m.Encounter(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        facility_id=fac_id,
        author_id=doc_id,
        provider_id=doc_id,
        visit_type='EECP Treatment Completed',
        chart_type='SOAP Template',
        mode='In Person',
        status='signed',
        signed_by=doc_id,
        signed_at=visit_dt,
        created_at=visit_dt,
        chief_complaint='POST EECP COMPLETE\nIMPROVED EXERCISE TOLERANCE\nREDUCED LIPID PROFILE',
        hpi='Chest Pain? No\nChest Pain Frequency per Week: nil\nS/L Nitroglycerin per Week: nil\nWalking Time without Symptoms: 60mins\nShortness of Breath? No\nEdema of Legs? No\nTrouble breathing while lying flat? No\nWaking up with sudden onset of shortness of breath at night? No\nPalpitations? No',
        medical_history='CAD Diagnosis: nil\nPTCA: nil\nCABG: nil\nMyocardial Infarction: nil\nDiabetes Type 1: nil\nDiabetes Type 2: nil\nHypertension: nil\nHyperlipidemia: 20 years',
        ros='EECP Indications & Contraindications\nEECP Indications',
        objective='Height: 168 cm, Weight: 71 kg, BMI: 25.16, BP: 120/80 mmHg, Pulse Rate: 72 bpm, SPO2: 98%',
        examination='Lungs: Auscultation -> Breath Sounds -> NVBS\nHeart: Auscultation -> S1 & S2 Normal\nCurrent Cardiac Rhythm? Normal Sinus Rhythm',
        assessment='Patient completed 35 hours of EECP therapy. Demonstrated notable improvement in exercise tolerance and functional capacity. Post-treatment lipid profile showed reduction in total cholesterol and triglycerides. No adverse cardiac events reported during the course.',
        plan='Follow a heart-friendly diet\nRegular physical exercise\nAvoid alcohol / tobacco chewing and quite smoking',
        follow_up='EECP short course 20 sessions to improve myocardial blood flow and exercise tolerance.',
        treatment_notes='EECP Treatment Notes\n\nMonitor weight daily\nMonitor new onset arrhythmias\nMonitor SpO2\nSlow pressure regime',
    )
    db.add(enc)
    db.flush()
    print(f"Created encounter: {enc.id}")
else:
    print(f"Found existing encounter: {enc.id}")

# Full SOAP JSON
soap_json = {
    "subjective": {
        "chief_complaints": [
            "POST EECP COMPLETE",
            "IMPROVED EXERCISE TOLERANCE",
            "REDUCED LIPID PROFILE"
        ],
        "history_of_present_illness": {
            "chest_pain": "No",
            "table": [
                {"parameter": "Chest Pain Frequency per Week:\n(No. of times per week)", "value": "nil"},
                {"parameter": "S/L Nitroglycerin per Week:\n(No. taken per week)", "value": "nil"},
                {"parameter": "Walking Time without Symptoms:\n(min.)", "value": "60mins"}
            ],
            "shortness_of_breath": "No",
            "edema_of_legs": "No",
            "trouble_breathing_flat": "No",
            "waking_up_shortness_breath_night": "No",
            "palpitations": "No"
        },
        "past_medical_history": {
            "grid": [
                {"name1": "CAD Diagnosis:\n(Years &amp; months)", "val1": "nil", "name2": "PTCA:\n(Years &amp; months)", "val2": "nil"},
                {"name1": "CABG:\n(Years &amp; months)", "val1": "nil", "name2": "Myocardial Infarction\n(Years &amp; months)", "val2": "nil"},
                {"name1": "Diabetes Type 1:\n(Years &amp; months)", "val1": "nil", "name2": "Diabetes Type 2:\n(Years &amp; months)", "val2": "nil"},
                {"name1": "Hypertension:\n(Years &amp; months)", "val1": "nil", "name2": "Hyperlipidemia:\n(Years &amp; months)", "val2": "20 years"}
            ]
        },
        "review_of_systems": [
            "EECP Indications & Contraindications",
            "EECP Indications"
        ]
    },
    "objective": {
        "health_vitals": {
            "height": "168 cm",
            "weight": "71 kg",
            "bmi": "25.16",
            "bp": "120/80 mmHg",
            "pulse_rate": "72 bpm",
            "spo2": "98%"
        },
        "physical_examination": [
            "Lungs: Auscultation -> Breath Sounds -> NVBS",
            "Heart: Auscultation -> S1 & S2 Normal",
            "Current Cardiac Rhythm? Normal Sinus Rhythm"
        ]
    },
    "assessment": {
        "notes": "Patient completed 35 hours of EECP therapy. Demonstrated notable improvement in exercise tolerance and functional capacity. Post-treatment lipid profile showed reduction in total cholesterol and triglycerides. No adverse cardiac events reported during the course.",
        "diagnoses": [
            {"code": "E78.1", "description": "Hyperlipoproteinaemia"}
        ]
    },
    "plan": {
        "prescriptions": [
            {
                "name": "Pitavastatin",
                "dosage": "4mg",
                "schedule": "0 - 0 - 0 - 1",
                "dispense": "1, Dispense As Written",
                "daw": True,
                "signed": True
            }
        ],
        "imaging": [
            "Vascular Assessment & Heart Rate Variability - CBP + Arterial Stiffness + Cf PWV + Cr PWV+ HRV",
            "ECG - Resting"
        ],
        "lifestyle_recommendations": [
            "Avoid alcohol / tobacco chewing and quite smoking",
            "Follow a heart-friendly diet",
            "Regular physical exercise"
        ],
        "treatment_notes": "EECP Treatment Notes\n\nMonitor weight daily\nMonitor new onset arrhythmias\nMonitor SpO2\nSlow pressure regime",
        "follow_up": [
            {
                "type": "Procedures",
                "notes": "EECP short course 20 sessions to improve myocardial blood flow and exercise tolerance.",
                "date": "Oct 18, 2026"
            }
        ],
        "procedure_codes": [
            {
                "description": "ECHO",
                "code": "93306",
                "quantity": 1,
                "charge": "2500.00"
            }
        ]
    },
    "signed_by": doc_name,
    "signed_at_formatted": "Nov 16, 2026 05:32 PM Asia/Kolkata"
}

# Create or update Consultation
consult = db.query(m.Consultation).filter(m.Consultation.id == enc.id).first()
if not consult:
    consult = m.Consultation(
        id=enc.id,
        patient_id=patient.id,
        provider_id=doc_id,
        facility_id=fac_id,
        facility_name=fac_name,
        visit_type='EECP Treatment Completed',
        visit_mode='In Person',
        visit_date=visit_dt,
        status='signed',
        signed_by=doc_id,
        signed_at=visit_dt,
        soap_json=soap_json,
        created_at=visit_dt,
        updated_at=visit_dt,
    )
    db.add(consult)
    print(f"Created consultation: {consult.id}")
else:
    consult.soap_json = soap_json
    consult.status = 'signed'
    consult.facility_name = fac_name
    print(f"Updated consultation: {consult.id}")

# Add active Diagnosis
diag = db.query(m.Diagnosis).filter(m.Diagnosis.encounter_id == enc.id).first()
if not diag:
    diag = m.Diagnosis(
        patient_id=patient.id,
        facility_id=fac_id,
        author_id=doc_id,
        encounter_id=enc.id,
        code='E78.1',
        description='Hyperlipoproteinaemia',
        status='active',
        created_at=visit_dt,
    )
    db.add(diag)

# Add active Medication
med = db.query(m.Medication).filter(m.Medication.encounter_id == enc.id).first()
if not med:
    med = m.Medication(
        patient_id=patient.id,
        facility_id=fac_id,
        author_id=doc_id,
        encounter_id=enc.id,
        trade_name='Pitavastatin (4mg)',
        generic_name='Pitavastatin',
        dose='4mg',
        route='Oral',
        maen='0 - 0 - 0 - 1',
        timing='0 - 0 - 0 - 1',
        duration_days=30,
        quantity=1,
        night=1.0,
        dispense_unit='Tablets',
        instructions='Dispense As Written',
        status='active',
        created_at=visit_dt,
    )
    db.add(med)

# Add Vital
vital = db.query(m.Vital).filter(m.Vital.encounter_id == enc.id).first()
if not vital:
    vital = m.Vital(
        patient_id=patient.id,
        facility_id=fac_id,
        author_id=doc_id,
        encounter_id=enc.id,
        height_cm=168.0,
        weight_kg=71.0,
        bp_sys=120,
        bp_dia=80,
        pulse_bpm=72,
        spo2_pct=98,
        bmi_percentile='25.16',
        created_at=visit_dt,
    )
    db.add(vital)

# Create DischargeSummary
report = db.query(m.DischargeSummary).filter(m.DischargeSummary.consultation_id == consult.id).first()
if not report:
    report_data = {
        "treatment_information": {
            "physician": doc_name,
            "from": "Nov 16, 2026",
            "total_treatment_hrs": "",
            "to": "",
            "sponsor": "",
            "requested_amount": ""
        },
        "procedure_done": "Vaso-Meditech Enhanced External Counter Pulsation (EECP) Treatment",
        "brief_history": "Patient completed 35 hours of EECP therapy. Demonstrated notable improvement in exercise tolerance and functional capacity. Post-treatment lipid profile showed reduction in total cholesterol and triglycerides. No adverse cardiac events reported during the course.",
        "narrative_values": {
            "sessions": "",
            "hours_per_day": "",
            "heart_rate_min": "",
            "heart_rate_max": "",
            "blood_pressure_average": "",
            "phase_one_p_value": "",
            "phase_one_a_value": "",
            "phase_two_p_value": "",
            "phase_two_a_value": "",
            "lower_extremity_pressure": "",
            "oxygen_flow": "",
            "oxygen_saturation": ""
        },
        "patient_education": "Continue heart-healthy lifestyle, low-sodium diet, regular aerobic exercise, and adherence to prescribed medications. Report any recurrent chest tightness or dyspnea immediately."
    }
    report = m.DischargeSummary(
        consultation_id=consult.id,
        patient_id=patient.id,
        report_data_json=report_data,
        updated_by=doc_id,
    )
    db.add(report)
    print(f"Created discharge summary: {report.id}")

db.commit()
print("Successfully committed Aruldoss Subramanian roa demonstration records!")
db.close()

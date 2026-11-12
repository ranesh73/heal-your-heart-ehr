"""
Complete clinical data restoration script for Heal Your Heart EHR.
Restores all rich clinical datasets across all facilities and patients:
- Patients (Isaac G. E., Aarav Demo, Mira Sample, Dev Example, Leela Demo, Arjun Sample, Tara Example)
- Branch associations (all patients accessible in all facilities)
- Vital observations & Flowsheet history across multiple dates
- Active diagnoses
- Active medications with M-A-E-N schedules & dosage
- Allergies with reactions & severity
- Patient medical, surgical, family & social histories
- Consultation encounters (SOAP notes, baseline cardiology evaluations, follow-ups)
- Injections & Vaccines
- EECP treatment plans, daily counterpulsation sessions, and weekly assessments
- Diagnostic Lab Orders & Lab Results with biomarkers, reference ranges & interpretations
- Cardiology Imaging Orders (ECHO, ECG, TMT, Angiogram) & test catalogs
- Calendar appointments (past, today, upcoming)
- Tasks, messages, and invoices
"""

import sys
import os
import json
import uuid
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

# Setup backend paths
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal, lock_writes
from app import models as m
from app.security import password_hash

def run_restoration():
    print("=== Restoring Full Clinical EHR Datasets for Heal Your Heart EHR ===")
    
    with SessionLocal() as db:
        lock_writes(db)
        
        # 1. Fetch Facilities
        facilities = db.query(m.Facility).all()
        if not facilities:
            print("No facilities found! Please run migrations and seed.py first.")
            return
        
        fac_hyn = next((f for f in facilities if f.code == "HYN"), facilities[0])
        print(f"Primary facility: {fac_hyn.name} ({fac_hyn.id})")
        print(f"Total facilities: {len(facilities)}")

        # 2. Fetch Users
        users = {u.role: u for u in db.query(m.User).all()}
        doc = users.get("doctor")
        assistant = users.get("assistant")
        therapist = users.get("therapist")
        reception = users.get("reception")
        billing = users.get("billing")
        admin = users.get("admin")

        if not doc:
            print("Doctor user not found! Please run seed.py first.")
            return

        # Ensure all staff have access to all facilities in user_facilities
        for u in users.values():
            for f in facilities:
                if not db.query(m.UserFacility).filter_by(user_id=u.id, facility_id=f.id).first():
                    db.add(m.UserFacility(user_id=u.id, facility_id=f.id))
        db.flush()

        # 3. Ensure Resources (Consultation rooms & EECP beds) exist for all facilities
        for f in facilities:
            if not db.query(m.Resource).filter_by(facility_id=f.id, kind="Consultation room").first():
                db.add(m.Resource(facility_id=f.id, name="Consultation room", kind="Consultation room"))
            for bed_num in range(1, 14):
                bed_name = f"EECP Room {bed_num:02}"
                if not db.query(m.Resource).filter_by(facility_id=f.id, name=bed_name).first():
                    db.add(m.Resource(facility_id=f.id, name=bed_name, kind="EECP bed"))
        db.flush()

        # 4. Patient Directory
        patient_definitions = [
            {
                "mrn": "HYN-MR-000207",
                "first_name": "Isaac",
                "last_name": "G. E.",
                "sex": "Male",
                "dob": date(1974, 5, 18),
                "blood_group": "O+ve",
                "phone": "+91 98765 43210",
                "email": "isaac.ge@demo.local",
                "address": "No. 14, East Coast Road, Neelankarai",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600115",
                "emergency_name": "Sarah G. E. (Spouse)",
                "emergency_phone": "+91 98765 43211",
                "referral_source": "Cardiologist Referral - Dr. K. Ramesh",
            },
            {
                "mrn": "HYN-MR-000001",
                "first_name": "Aarav",
                "last_name": "Demo",
                "sex": "Male",
                "dob": date(1968, 1, 12),
                "blood_group": "B+ve",
                "phone": "+91 98401 23456",
                "email": "aarav.demo@example.com",
                "address": "45, Anna Salai, Royapettah",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600014",
                "emergency_name": "Kavitha Demo (Wife)",
                "emergency_phone": "+91 98401 23457",
                "referral_source": "General Practitioner",
            },
            {
                "mrn": "HYN-MR-000002",
                "first_name": "Mira",
                "last_name": "Sample",
                "sex": "Female",
                "dob": date(1975, 2, 12),
                "blood_group": "A+ve",
                "phone": "+91 98402 34567",
                "email": "mira.sample@example.com",
                "address": "12, Besant Avenue, Adyar",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600020",
                "emergency_name": "Rajesh Sample (Husband)",
                "emergency_phone": "+91 98402 34568",
                "referral_source": "Self / Website",
            },
            {
                "mrn": "HYN-MR-000003",
                "first_name": "Dev",
                "last_name": "Example",
                "sex": "Male",
                "dob": date(1958, 3, 12),
                "blood_group": "O-ve",
                "phone": "+91 98403 45678",
                "email": "dev.example@example.com",
                "address": "78, Mount Road, Guindy",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600032",
                "emergency_name": "Sunita Example (Daughter)",
                "emergency_phone": "+91 98403 45679",
                "referral_source": "Consultant Physician",
            },
            {
                "mrn": "HYN-MR-000004",
                "first_name": "Leela",
                "last_name": "Demo",
                "sex": "Female",
                "dob": date(1982, 4, 12),
                "blood_group": "AB+ve",
                "phone": "+91 98404 56789",
                "email": "leela.demo@example.com",
                "address": "23, 2nd Avenue, Harrington Road, Chetpet",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600031",
                "emergency_name": "Manoj Demo (Spouse)",
                "emergency_phone": "+91 98404 56780",
                "referral_source": "Friend / Family",
            },
            {
                "mrn": "HYN-MR-000005",
                "first_name": "Arjun",
                "last_name": "Sample",
                "sex": "Male",
                "dob": date(1971, 5, 12),
                "blood_group": "B+ve",
                "phone": "+91 98405 67890",
                "email": "arjun.sample@example.com",
                "address": "56, Nelson Manickam Road, Aminjikarai",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600029",
                "emergency_name": "Deepa Sample (Sister)",
                "emergency_phone": "+91 98405 67891",
                "referral_source": "Online Search",
            },
            {
                "mrn": "HYN-MR-000006",
                "first_name": "Tara",
                "last_name": "Example",
                "sex": "Female",
                "dob": date(1990, 6, 12),
                "blood_group": "A-ve",
                "phone": "+91 98406 78901",
                "email": "tara.example@example.com",
                "address": "89, Velachery Main Road",
                "city": "Chennai",
                "district": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600042",
                "emergency_name": "Vikram Example (Father)",
                "emergency_phone": "+91 98406 78902",
                "referral_source": "Preventive Cardiology Camp",
            }
        ]

        patients_by_name = {}
        for pdef in patient_definitions:
            existing = db.query(m.Patient).filter(
                (m.Patient.first_name == pdef["first_name"]) & (m.Patient.last_name == pdef["last_name"])
            ).first()

            if not existing:
                existing = db.query(m.Patient).filter(m.Patient.mrn == pdef["mrn"]).first()

            if existing:
                for k, v in pdef.items():
                    setattr(existing, k, v)
                existing.primary_facility_id = fac_hyn.id
                existing.provider_id = doc.id
                existing.communication_opt_in = True
                existing.active = True
                pat = existing
            else:
                pat = m.Patient(
                    primary_facility_id=fac_hyn.id,
                    provider_id=doc.id,
                    communication_opt_in=True,
                    active=True,
                    **pdef
                )
                db.add(pat)
                db.flush()

            patients_by_name[f"{pat.first_name} {pat.last_name}"] = pat

            # Link patient to ALL 5 facilities so branch dropdown works flawlessly
            for f in facilities:
                if not db.query(m.PatientFacility).filter_by(patient_id=pat.id, facility_id=f.id).first():
                    db.add(m.PatientFacility(patient_id=pat.id, facility_id=f.id))

        db.flush()
        print(f"Populated {len(patients_by_name)} core patients with full demographics and linked to all {len(facilities)} branches.")

        isaac = patients_by_name.get("Isaac G. E.")
        aarav = patients_by_name.get("Aarav Demo")
        dev = patients_by_name.get("Dev Example")
        mira = patients_by_name.get("Mira Sample")

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        today_date = date.today()

        # Helper to create patient record common args
        def rec_common(pat, days_ago=0):
            created = now_utc - timedelta(days=days_ago)
            return {
                "patient_id": pat.id,
                "facility_id": fac_hyn.id,
                "author_id": doc.id,
                "created_at": created,
                "version": 1
            }

        # 5. Serial Vitals Observations (Enables Flowsheet & Trend Charts)
        vitals_data = [
            # Isaac G. E. - 4 sequential observations
            (isaac, 30, dict(weight_kg=78.5, height_cm=175.0, bp_sys=144.0, bp_dia=92.0, pulse_bpm=84.0, spo2_pct=96.0, temperature_f=98.4, respiration_rate=18.0, central_sys=132.0, central_dia=88.0, cr_pwv=9.2, cf_pwv=10.1, vascular_age=58.0, hba1c_pct=7.2)),
            (isaac, 20, dict(weight_kg=77.8, height_cm=175.0, bp_sys=136.0, bp_dia=86.0, pulse_bpm=78.0, spo2_pct=97.0, temperature_f=98.6, respiration_rate=16.0, central_sys=126.0, central_dia=82.0, cr_pwv=8.6, cf_pwv=9.4, vascular_age=56.0, hba1c_pct=7.0)),
            (isaac, 10, dict(weight_kg=76.9, height_cm=175.0, bp_sys=130.0, bp_dia=82.0, pulse_bpm=74.0, spo2_pct=98.0, temperature_f=98.5, respiration_rate=16.0, central_sys=120.0, central_dia=78.0, cr_pwv=7.9, cf_pwv=8.7, vascular_age=54.0, hba1c_pct=6.8)),
            (isaac, 1, dict(weight_kg=76.2, height_cm=175.0, bp_sys=124.0, bp_dia=78.0, pulse_bpm=72.0, spo2_pct=99.0, temperature_f=98.4, respiration_rate=14.0, central_sys=116.0, central_dia=74.0, cr_pwv=7.4, cf_pwv=8.1, vascular_age=52.0, hba1c_pct=6.7)),

            # Aarav Demo - 3 observations
            (aarav, 25, dict(weight_kg=74.0, height_cm=170.0, bp_sys=138.0, bp_dia=88.0, pulse_bpm=80.0, spo2_pct=97.0, temperature_f=98.6, respiration_rate=18.0, central_sys=128.0, central_dia=84.0, cr_pwv=8.4, cf_pwv=9.2, vascular_age=62.0, hba1c_pct=7.4)),
            (aarav, 12, dict(weight_kg=73.2, height_cm=170.0, bp_sys=130.0, bp_dia=82.0, pulse_bpm=76.0, spo2_pct=98.0, temperature_f=98.4, respiration_rate=16.0, central_sys=122.0, central_dia=78.0, cr_pwv=7.8, cf_pwv=8.5, vascular_age=60.0, hba1c_pct=7.1)),
            (aarav, 2, dict(weight_kg=72.4, height_cm=170.0, bp_sys=124.0, bp_dia=78.0, pulse_bpm=74.0, spo2_pct=98.0, temperature_f=98.2, respiration_rate=16.0, central_sys=116.0, central_dia=76.0, cr_pwv=7.2, cf_pwv=8.1, vascular_age=58.0, hba1c_pct=6.9)),

            # Dev Example
            (dev, 15, dict(weight_kg=68.5, height_cm=168.0, bp_sys=142.0, bp_dia=86.0, pulse_bpm=76.0, spo2_pct=96.0, temperature_f=98.6, respiration_rate=18.0, central_sys=132.0, central_dia=82.0, cr_pwv=9.6, cf_pwv=10.4, vascular_age=72.0, hba1c_pct=6.8)),
            (dev, 3, dict(weight_kg=67.9, height_cm=168.0, bp_sys=132.0, bp_dia=80.0, pulse_bpm=72.0, spo2_pct=97.0, temperature_f=98.4, respiration_rate=16.0, central_sys=124.0, central_dia=76.0, cr_pwv=8.8, cf_pwv=9.5, vascular_age=70.0, hba1c_pct=6.6)),

            # Mira Sample
            (mira, 14, dict(weight_kg=62.0, height_cm=160.0, bp_sys=128.0, bp_dia=82.0, pulse_bpm=76.0, spo2_pct=98.0, temperature_f=98.6, respiration_rate=16.0, central_sys=118.0, central_dia=78.0, cr_pwv=7.4, cf_pwv=8.0, vascular_age=52.0, hba1c_pct=6.2)),
            (mira, 2, dict(weight_kg=61.4, height_cm=160.0, bp_sys=120.0, bp_dia=76.0, pulse_bpm=72.0, spo2_pct=99.0, temperature_f=98.4, respiration_rate=14.0, central_sys=112.0, central_dia=72.0, cr_pwv=6.9, cf_pwv=7.6, vascular_age=50.0, hba1c_pct=6.0)),
        ]

        for pat, days, vfields in vitals_data:
            obs_time = now_utc - timedelta(days=days)
            existing_v = db.query(m.Vital).filter(
                (m.Vital.patient_id == pat.id) & (m.Vital.observed_at == obs_time)
            ).first()
            if not existing_v:
                db.add(m.Vital(
                    **rec_common(pat, days),
                    observed_at=obs_time,
                    **vfields
                ))
        db.flush()
        print("Restored multi-point vitals history and flowsheet measurements.")

        # 6. Diagnoses
        diagnoses_data = [
            (isaac, "I25.10", "Atherosclerotic heart disease of native coronary artery with angina pectoris", date(2022, 10, 15), "active"),
            (isaac, "I10", "Essential (primary) hypertension", date(2016, 4, 10), "active"),
            (isaac, "E11.9", "Type 2 diabetes mellitus without complications", date(2018, 6, 20), "active"),
            (isaac, "E78.5", "Hyperlipidemia, unspecified", date(2019, 1, 12), "active"),
            (isaac, "Z95.5", "Presence of coronary angioplasty implant and stent (DES to LAD)", date(2022, 11, 4), "active"),

            (aarav, "I25.10", "Coronary artery disease - Exertional angina Class II", date(2023, 2, 10), "active"),
            (aarav, "I10", "Essential hypertension", date(2015, 8, 14), "active"),
            (aarav, "E11.9", "Type 2 diabetes mellitus", date(2017, 3, 22), "active"),

            (dev, "I25.2", "Old myocardial infarction", date(2018, 5, 12), "active"),
            (dev, "I50.9", "Heart failure with preserved ejection fraction (HFpEF)", date(2021, 9, 8), "active"),
            (dev, "I10", "Systemic hypertension", date(2012, 11, 1), "active"),

            (mira, "I20.9", "Angina pectoris, unspecified", date(2024, 1, 18), "active"),
            (mira, "E78.0", "Pure hypercholesterolemia", date(2022, 7, 14), "active"),
        ]

        for pat, code, desc, onset, st in diagnoses_data:
            if not db.query(m.Diagnosis).filter_by(patient_id=pat.id, code=code).first():
                db.add(m.Diagnosis(
                    **rec_common(pat, 10),
                    code=code,
                    description=desc,
                    onset=onset,
                    status=st
                ))
        db.flush()
        print("Restored active diagnoses and clinical ICD-10 problem lists.")

        # 7. Medications with M-A-E-N schedules
        medications_data = [
            # Isaac G. E.
            (isaac, "Telma 40mg", "Telmisartan 40mg", "40 mg", "Oral", "1-0-0-0 (Morning)", "1-0-0-0", 30, 30, "Take after breakfast with a full glass of water. Monitor morning BP."),
            (isaac, "Atorva 20mg", "Atorvastatin 20mg", "20 mg", "Oral", "0-0-0-1 (Night)", "0-0-0-1", 30, 30, "Take after dinner at bedtime."),
            (isaac, "Metolar XR 50mg", "Metoprolol Succinate 50mg", "50 mg", "Oral", "1-0-1-0 (BD)", "1-0-1-0", 30, 60, "Take with food. Do not skip doses."),
            (isaac, "Ecosprin 75mg", "Aspirin 75mg", "75 mg", "Oral", "0-1-0-0 (Afternoon)", "0-1-0-0", 30, 30, "Take post lunch with water."),
            (isaac, "Glycomet-GP 1", "Glimepiride 1mg + Metformin 500mg", "1 Tab", "Oral", "1-0-0-0 (Morning)", "1-0-0-0", 30, 30, "Take 15 minutes before breakfast."),
            (isaac, "Sorbitrate 5mg", "Isosorbide Dinitrate 5mg", "5 mg", "Sublingual", "PRN (As needed)", "0-0-0-0", 30, 10, "Place 1 tablet under tongue for sudden chest pain. Repeat after 5 mins if not relieved."),

            # Aarav Demo
            (aarav, "Telma 40mg", "Telmisartan 40mg", "40 mg", "Oral", "1-0-0-0", "1-0-0-0", 30, 30, "Morning with water"),
            (aarav, "Rosuvas 10mg", "Rosuvastatin 10mg", "10 mg", "Oral", "0-0-0-1", "0-0-0-1", 30, 30, "Bedtime post dinner"),
            (aarav, "Cardivas 6.25mg", "Carvedilol 6.25mg", "6.25 mg", "Oral", "1-0-1-0", "1-0-1-0", 30, 60, "Twice daily with meals"),

            # Dev Example
            (dev, "Ramipril 5mg", "Ramipril 5mg", "5 mg", "Oral", "1-0-0-0", "1-0-0-0", 30, 30, "Daily morning"),
            (dev, "Concor 2.5mg", "Bisoprolol 2.5mg", "2.5 mg", "Oral", "1-0-0-0", "1-0-0-0", 30, 30, "Daily morning"),
            (dev, "Dytor 10mg", "Torsemide 10mg", "10 mg", "Oral", "1-0-0-0", "1-0-0-0", 30, 30, "Morning after breakfast"),

            # Mira Sample
            (mira, "Atorva 10mg", "Atorvastatin 10mg", "10 mg", "Oral", "0-0-0-1", "0-0-0-1", 30, 30, "At bedtime"),
            (mira, "Amlong 5mg", "Amlodipine 5mg", "5 mg", "Oral", "1-0-0-0", "1-0-0-0", 30, 30, "Morning"),
        ]

        for pat, trade, generic, dose, route, freq, maen, dur, qty, instr in medications_data:
            if not db.query(m.Medication).filter_by(patient_id=pat.id, trade_name=trade).first():
                db.add(m.Medication(
                    **rec_common(pat, 15),
                    trade_name=trade,
                    generic_name=generic,
                    dose=dose,
                    route=route,
                    frequency=freq,
                    maen=maen,
                    duration_days=dur,
                    quantity=qty,
                    instructions=instr,
                    substitution_allowed=True,
                    status="active",
                    start_date=today_date - timedelta(days=15),
                    end_date=today_date + timedelta(days=dur - 15)
                ))
        db.flush()
        print("Restored active medications and prescriptions.")

        # 8. Allergies
        allergies_data = [
            (isaac, "Drug", "Penicillin", "Severe", "Urticarial rash, bronchospasm, and periorbital edema requiring emergency antihistamines."),
            (isaac, "Food", "Shellfish", "Moderate", "Generalized itching and lip swelling."),
            (aarav, "Drug", "Sulfa drugs", "Moderate", "Erythematous macular rash on trunk and extremities."),
            (dev, "Drug", "No Known Drug Allergies (NKDA)", "None", "Patient denies any drug, food, or environmental allergies."),
            (mira, "Drug", "Aspirin", "Mild", "Gastric irritation and dyspepsia with standard formulations."),
        ]

        for pat, cat, allergen, sev, reac in allergies_data:
            if not db.query(m.Allergy).filter_by(patient_id=pat.id, allergen=allergen).first():
                db.add(m.Allergy(
                    **rec_common(pat, 30),
                    category=cat,
                    allergen=allergen,
                    severity=sev,
                    reaction=reac,
                    status="active"
                ))
        db.flush()
        print("Restored documented allergies.")

        # 9. Medical Histories
        histories_data = [
            (isaac, "Medical", "Coronary Artery Disease with prior Non-ST Elevation Myocardial Infarction in October 2022. Exertional Angina CCS Class II. Hypertension diagnosed in 2016 on ACEi/ARB. Type 2 Diabetes Mellitus x 8 years on oral hypoglycemics."),
            (isaac, "Surgical", "Percutaneous Coronary Intervention (PCI) with Drug Eluting Stent (DES) to proximal Left Anterior Descending (LAD) coronary artery in November 2022 at Apollo Hospitals, Chennai."),
            (isaac, "Family", "Father suffered sudden cardiac death at age 54. Mother diagnosed with hypertension and type 2 diabetes mellitus at age 52. Elder brother underwent CABG at age 56."),
            (isaac, "Social", "Non-smoker. Consumes alcohol socially (1-2 drinks/month). Sedentary software executive desk job. Walking 20-30 minutes 4 days/week."),

            (aarav, "Medical", "Exertional chest tightness on brisk walking and stairs for 6 months. Known hypertensive and diabetic for 9 years."),
            (aarav, "Surgical", "Appendectomy in 1995 (uncomplicated)."),
            (aarav, "Family", "Strong family history of ischemic heart disease. Both paternal uncles had CAD in their 50s."),

            (dev, "Medical", "Prior inferior wall MI in 2018 managed medically. Diagnosed with HFpEF with baseline NYHA Class II symptoms."),
            (mira, "Medical", "Atypical chest discomfort and exertional fatigue. Borderline dyslipidemia. Baseline ECG showed non-specific T wave changes."),
        ]

        for pat, cat, content in histories_data:
            if not db.query(m.History).filter_by(patient_id=pat.id, category=cat).first():
                db.add(m.History(
                    **rec_common(pat, 30),
                    category=cat,
                    content=content
                ))
        db.flush()
        print("Restored clinical histories.")

        # 10. Injections & Vaccines
        injections_data = [
            (isaac, "Fondaflo 2.5mg (Fondaparinux)", "2.5 mg / 0.5 mL", "Subcutaneous", "Left abdominal wall", "LOT-FND-8821A", "Administered subcutaneous without resistance. Patient monitored 15 minutes post-dose. No immediate adverse reaction."),
            (isaac, "Heparin 5000 IU", "5000 IU", "Subcutaneous", "Right abdominal wall", "LOT-HEP-9042B", "Routine prophylactic dose administered."),
            (aarav, "Methylcobalamin 1000mcg (Vit B12)", "1000 mcg", "Intramuscular", "Right gluteal region", "LOT-MCB-7711C", "Deep IM injection administered."),
        ]

        for pat, name, dose, route, site, lot, notes in injections_data:
            if not db.query(m.Injection).filter_by(patient_id=pat.id, name=name).first():
                db.add(m.Injection(
                    **rec_common(pat, 5),
                    name=name,
                    dose=dose,
                    route=route,
                    site=site,
                    lot_number=lot,
                    administered_by=doc.id,
                    administered_at=now_utc - timedelta(days=5),
                    nurse_notes=notes,
                    status="administered"
                ))

        vaccines_data = [
            (isaac, "Influenza seasonal quadrivalent", "0.5 mL", "Intramuscular", "Left deltoid", "LOT-FLU-2026Q", "Annual seasonal quadrivalent influenza immunization administered."),
            (isaac, "Pneumococcal 23-valent (Pneumovax 23)", "0.5 mL", "Intramuscular", "Right deltoid", "LOT-PNX-2309K", "Pneumococcal polysaccharide vaccine for cardiac high-risk patient."),
            (aarav, "Hepatitis B recombinant", "1.0 mL", "Intramuscular", "Left deltoid", "LOT-HBV-5542R", "Booster dose administered."),
        ]

        for pat, vname, dose, route, site, lot, notes in vaccines_data:
            if not db.query(m.Vaccine).filter_by(patient_id=pat.id, vaccine_name=vname).first():
                db.add(m.Vaccine(
                    **rec_common(pat, 20),
                    vaccine_name=vname,
                    dose=dose,
                    route=route,
                    site=site,
                    lot_number=lot,
                    ordered_by=doc.id,
                    administered_by=doc.id,
                    administered_at=now_utc - timedelta(days=20),
                    notes=notes,
                    status="administered"
                ))
        db.flush()
        print("Restored administered injections and immunization history.")

        # 11. Consultation Encounters / SOAP Notes
        encounters_data = [
            (isaac, "Initial Consultation", "SOAP Template", "In Person", "signed", 25,
             "Exertional retrosternal chest pain radiating to left shoulder and jaw on climbing stairs (CCS Class II). Shortness of breath on moderate exertion.",
             "Mr. Isaac G. E., a 52-year-old male executive with known history of CAD S/P PCI with DES to LAD in Nov 2022, presents for comprehensive cardiac assessment and EECP evaluation. Reports exertional heaviness in chest for past 3 months occurring after walking 200 meters briskly or climbing 2 flights of stairs. Relieved within 3-5 minutes of resting. Occasional sublingual nitrate use (1-2 times/week). No rest angina, syncope, or orthopnea.",
             "Review of Systems: Cardiovascular: Exertional angina (+), Palpitations (-), Claudication (-), Pedal edema (-). Respiratory: Exertional dyspnea on slopes (+), Orthopnea (-), PND (-). Gastrointestinal: Acid reflux occasional, no melena. Endocrine: Stable glucose on current oral regimen.",
             "General: Alert, comfortable at rest, no pallor or cyanosis. Vitals: BP 138/88 mmHg, HR 78 bpm, SpO2 98% room air. CVS: S1, S2 audible, normal intensity. No S3, S4, or murmurs. Carotid pulses normal without bruits. Lungs: Clear vesicular breath sounds bilaterally, no crackles or rhonchi. Abdomen: Soft, non-tender, no hepatomegaly. Extremities: Peripheral pulses palpable (Dorsalis pedis & posterior tibial 2+ bilaterally). No pedal edema.",
             "1. Coronary Artery Disease - Chronic Stable Angina (CCS Class II) S/P LAD stenting (2022).\n2. Essential Hypertension - Stage 1, moderately controlled.\n3. Type 2 Diabetes Mellitus - Suboptimal control.\n4. Dyslipidemia - Elevated atherogenic lipids.\n5. Clinical Candidate for Enhanced External Counterpulsation (EECP) Therapy (35-session protocol).",
             "1. Initiated Enhanced External Counterpulsation (EECP) 35-session treatment course for refractory Class II angina.\n2. Optimized medical therapy: Telma 40mg od, Atorva 20mg hs, Metolar XR 50mg bd, Ecosprin 75mg post lunch.\n3. Order comprehensive baseline lab work: HUH-Cardio Diabetic Panel, Lipids, Cardiac Risk Markers.\n4. Scheduled 2D Echo and TMT review.\n5. Lifestyle & Cardiac Rehab diet counseling: Low sodium (<2g/day), Mediterranean heart-healthy diet, regular 30-min walking."),

            (isaac, "Follow-up Consultation", "SOAP Template", "In Person", "signed", 10,
             "Mid-course EECP clinical review (Session 15). Follow-up on symptoms and exercise tolerance.",
             "Patient has completed 15 sessions of EECP without adverse events. Reports marked symptomatic improvement: walking 45-60 minutes daily without exertional tightness. Sublingual nitrate requirement has dropped to zero over the past 2 weeks. Energy levels improved.",
             "Cardiovascular: Angina frequency: Nil over last 14 days. Exercise capacity: Improved significantly. Resting BP: 126/80 mmHg, HR: 72 bpm.",
             "Vitals: BP 126/80 mmHg, HR 72 bpm, SpO2 99%. Lungs clear. Peripheral perfusion excellent. D/S ratio on counterpulsation consistently maintained at 1.5 - 1.7.",
             "1. CAD with Stable Angina - Marked functional improvement, symptomatically downgraded from CCS Class II to CCS Class I.\n2. Good hemodynamic response to EECP counterpulsation therapy.\n3. Well controlled BP and glycemic parameters.",
             "1. Continue remaining 20 sessions of EECP treatment to complete full 35-session protocol.\n2. Maintain current pharmacological regimen without change.\n3. Re-evaluate at Session 35 with repeat lipid panel, ECG, and exercise treadmill assessment."),

            (isaac, "Routine Follow-up", "Quick", "In Person", "draft", 0,
             "Scheduled weekly evaluation and prescription refill review.",
             "Patient attends for routine progress check. Denies chest discomfort, palpitations, or dyspnea.",
             "Review of systems benign. Compliance with daily medications confirmed.",
             "Vitals: BP 124/78 mmHg, HR 72 bpm, SpO2 99%, Weight 76.2 kg. Heart sounds normal.",
             "Stable CAD post-EECP session 22. Stable hemodynamics.",
             "Refill prescriptions for Telma, Atorva, and Metolar XR. Continue scheduled EECP treatment."),

            (aarav, "Initial Consultation", "SOAP Template", "In Person", "signed", 20,
             "Exertional breathlessness and heaviness in chest for 6 months.",
             "58-year-old male with long-standing hypertension and diabetes presents with exertional angina on walking briskly.",
             "Cardiovascular: Exertional chest tightness (+), no orthopnea.",
             "BP 138/88 mmHg, HR 80 bpm, SpO2 97%. Heart: S1 S2 heard. Lungs clear.",
             "1. CAD with exertional angina CCS Class II.\n2. Hypertension & T2DM.\n3. Candidate for EECP evaluation.",
             "1. Recommend 35-session EECP therapy.\n2. Continue anti-ischemic and antihypertensive medications.\n3. Order baseline cardiac labs and Echo."),
        ]

        for pat, vtype, ctype, mode, status, days, cc, hpi, ros, exam, assess, plan in encounters_data:
            enc_date = now_utc - timedelta(days=days)
            existing_enc = db.query(m.Encounter).filter(
                (m.Encounter.patient_id == pat.id) & (m.Encounter.chief_complaint == cc)
            ).first()

            if not existing_enc:
                enc = m.Encounter(
                    **rec_common(pat, days),
                    provider_id=doc.id,
                    assistant_id=assistant.id if assistant else doc.id,
                    visit_type=vtype,
                    chart_type=ctype,
                    mode=mode,
                    status=status,
                    chief_complaint=cc,
                    hpi=hpi,
                    ros=ros,
                    examination=exam,
                    assessment=assess,
                    plan=plan,
                    signed_at=enc_date if status == "signed" else None,
                    signed_by=doc.id if status == "signed" else None,
                    signature_digest="a8f9c02d1e345b67890123456789abcdef0123456789abcdef0123456789abcd" if status == "signed" else None
                )
                db.add(enc)
        db.flush()
        print("Restored rich consultation encounters and SOAP notes.")

        # 12. EECP Treatment Plan & Daily Sessions
        for pat in [isaac, aarav]:
            plan = db.query(m.Plan).filter_by(patient_id=pat.id).first()
            bed = db.query(m.Resource).filter(m.Resource.facility_id == fac_hyn.id, m.Resource.kind == "EECP bed").first()
            if not bed:
                bed = m.Resource(facility_id=fac_hyn.id, name="EECP Room 01", kind="EECP bed")
                db.add(bed)
                db.flush()

            if not plan:
                plan = m.Plan(
                    **rec_common(pat, 25),
                    program="EECP · 35-session course",
                    session_count=35,
                    therapist_id=therapist.id if therapist else doc.id,
                    start_date=today_date - timedelta(days=22),
                    status="authorized",
                    authorized_by=doc.id,
                    authorized_at=now_utc - timedelta(days=23),
                    reason="Refractory angina CCS Class II despite optimal medical therapy in post-PCI patient."
                )
                db.add(plan)
                db.flush()

            # Seed daily sessions 1 to 15
            for s_num in range(1, 16):
                s_day = today_date - timedelta(days=(22 - s_num))
                existing_s = db.query(m.DailySession).filter_by(plan_id=plan.id, session_number=s_num).first()
                if not existing_s:
                    # Create appointment for session
                    appt_start = datetime.combine(s_day, datetime.min.time()).replace(hour=10)
                    appt = db.query(m.Appointment).filter_by(plan_id=plan.id, session_number=s_num).first()
                    if not appt:
                        appt = m.Appointment(
                            **rec_common(pat, 22 - s_num),
                            provider_id=therapist.id if therapist else doc.id,
                            resource_id=bed.id,
                            plan_id=plan.id,
                            session_number=s_num,
                            start_at=appt_start,
                            end_at=appt_start + timedelta(hours=1),
                            visit_type="EECP session",
                            status="completed"
                        )
                        db.add(appt)
                        db.flush()

                    db.add(m.DailySession(
                        **rec_common(pat, 22 - s_num),
                        plan_id=plan.id,
                        appointment_id=appt.id,
                        therapist_id=therapist.id if therapist else doc.id,
                        resource_id=bed.id,
                        session_number=s_num,
                        status="completed",
                        started_at=appt_start,
                        completed_at=appt_start + timedelta(hours=1),
                        pre_weight_kg=78.0 - (s_num * 0.1),
                        pre_bp_sys=140.0 - (s_num * 1.0),
                        pre_bp_dia=88.0 - (s_num * 0.6),
                        pre_hr=78.0 - (s_num * 0.3),
                        pre_spo2=98.0,
                        min15_ds_peak=1.4 + (s_num * 0.02),
                        min15_ds_area=1.35 + (s_num * 0.02),
                        min15_hr=74.0,
                        min15_pressure=260.0,
                        min45_ds_peak=1.55 + (s_num * 0.02),
                        min45_ds_area=1.50 + (s_num * 0.02),
                        min45_hr=72.0,
                        min45_pressure=280.0,
                        pressure_unit="mmHg",
                        observations=f"Session {s_num}: Patient tolerated 35 PSI compression well without discomfort. Skin integrity intact under cuffs."
                    ))

            # Weekly Assessments (Week 1, Week 2)
            for w_num in [1, 2]:
                if not db.query(m.WeeklyAssessment).filter_by(plan_id=plan.id, week_number=w_num).first():
                    db.add(m.WeeklyAssessment(
                        **rec_common(pat, 22 - (w_num * 7)),
                        plan_id=plan.id,
                        week_number=w_num,
                        weight_kg=77.5 - (w_num * 0.5),
                        height_cm=175.0,
                        bp_sys=136.0 - (w_num * 6.0),
                        bp_dia=86.0 - (w_num * 4.0),
                        pulse_bpm=76.0 - (w_num * 2.0),
                        exercise_minutes=30.0 + (w_num * 15.0),
                        walk_distance_m=1200.0 + (w_num * 600.0),
                        nyha_class="II" if w_num == 1 else "I",
                        ccs_class="II" if w_num == 1 else "I",
                        pre_glucose=112.0 - (w_num * 4.0),
                        post_glucose=144.0 - (w_num * 6.0),
                        water_ml=2000.0,
                        qol_score=3,
                        physician_evaluation=f"Week {w_num} review: Excellent hemodynamic response. Patient reports substantial reduction in exertional fatigue.",
                        physician_id=doc.id,
                        reviewed_at=now_utc - timedelta(days=22 - (w_num * 7))
                    ))
        db.flush()
        print("Restored EECP treatment plan, 15 daily counterpulsation sessions, and weekly assessments.")

        # 13. Standard Lab Catalogs (kind='lab_test') across all facilities
        lab_tests_catalog = [
            ("LIPID", "HUH - Lipid Profile", ["Total Cholesterol", "Triglycerides", "HDL Cholesterol", "LDL Cholesterol", "VLDL", "TC/HDL Ratio"]),
            ("RFT", "HUH - Renal Function", ["Blood Urea Nitrogen", "Creatinine", "Uric Acid", "eGFR"]),
            ("CBC", "HUH - Complete Hemogram", ["Haemoglobin", "Total WBC Count", "Platelet Count", "RBC Count", "PCV/Hematocrit"]),
            ("DIAB", "HUH - Diabetic Profile", ["Fasting Blood Sugar", "Postprandial Blood Sugar", "HbA1c", "Average Blood Glucose"]),
            ("ELECTRO", "HUH - Electrolytes", ["Sodium", "Potassium", "Chloride", "Bicarbonate"]),
            ("CARDIAC_RISK", "HUH-CD-Cardiac Risk Marker", ["Apolipoprotein-A1", "Apolipoprotein-B", "Apo B/Apo A1 Ratio", "hs-CRP", "Homocysteine", "Lipoprotein(a)"]),
            ("BONE", "HUH-CD-Bone Marker", ["Calcium", "Phosphorous", "Alkaline Phosphatase", "Vitamin D3 (25-OH)"]),
            ("LFT", "HUH-CD-Liver Function Test", ["Total Bilirubin", "Direct Bilirubin", "SGOT (AST)", "SGPT (ALT)", "Total Protein", "Albumin"]),
            ("THYROID", "HUH-CD-Free Thyroid", ["TSH", "Free T3", "Free T4"]),
            ("CARDIAC_ENZ", "HUH-CD-Cardiac Troponin & BNP", ["Cardiac Troponin I", "HUH-N Terminal Pro B Natriuretic Peptide", "Creatine Kinase-MB"]),
        ]

        for f in facilities:
            for code, name, params in lab_tests_catalog:
                cat_code = f"LAB_{code}"
                content = json.dumps({
                    "group": "Heal Your Heart Central Laboratory",
                    "parameters": params,
                    "is_group": len(params) > 1
                })
                existing_cat = db.query(m.Catalog).filter_by(facility_id=f.id, kind="lab_test", code=cat_code).first()
                if not existing_cat:
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind="lab_test",
                        code=cat_code,
                        name=name,
                        price_paise=0,
                        content=content,
                        active=True
                    ))
        db.flush()
        print("Restored standard lab test catalogs across all 5 facilities.")

        # 14. Standard Image Test Catalogs (kind='image_test' & 'image_template')
        image_tests_catalog = [
            ("ECHO_2D", "ECHO", "2D Echocardiography with Color Doppler [ 93306 ]"),
            ("ECHO_TEE", "ECHO", "Transesophageal Echocardiography (TEE) [ 93312 ]"),
            ("ECHO_STRESS", "ECHO", "Stress Echocardiography Complete [ 93351 ]"),
            ("ECG_12", "ECG", "12-Lead Electrocardiogram with Interpretation [ 93000 ]"),
            ("ECG_REST", "ECG", "Resting ECG [ 93000 ]"),
            ("TMT_BRUCE", "Tread Mill Stress Test", "TMT - Bruce Protocol [ 93015 ]"),
            ("CAG_LEFT", "Angiogram", "Coronary Angiogram with Left Heart Catheterization [ 93458 ]"),
            ("CAROTID_DOPPLER", "Doppler scan", "Carotid Doppler Bilateral [ 93880 ]"),
            ("CTCA", "CT Scan", "CT Coronary Angiography (CTCA) [ 75574 ]"),
            ("CT_CALCIUM", "CT Scan", "CT Calcium Score [ 75571 ]"),
            ("MRI_CARDIAC", "MRI", "Cardiac MRI with Contrast (Viability & Perfusion) [ 75561 ]"),
            ("XRAY_CHEST", "X-ray", "Chest X-Ray PA & Lateral [ 71046 ]"),
            ("SPHYGMO_PWA", "SphygmoCor", "Central Aortic Pressure & Pulse Wave Analysis [ 93050 ]"),
        ]

        for f in facilities:
            for code, img_type, test_name in image_tests_catalog:
                cat_code = f"IMG_{code}"
                content = json.dumps({"image_type": img_type, "test_name": test_name})
                if not db.query(m.Catalog).filter_by(facility_id=f.id, kind="image_test", code=cat_code).first():
                    db.add(m.Catalog(
                        facility_id=f.id,
                        kind="image_test",
                        code=cat_code,
                        name=f"{img_type} · {test_name}",
                        price_paise=0,
                        content=content,
                        active=True
                    ))
        db.flush()
        print("Restored imaging test catalogs across all 5 facilities.")

        # Seed clinical formulary catalogs (injections, medications, vaccines)
        try:
            from scripts.seed_clinical_catalogs import seed_catalogs
            seed_catalogs()
        except Exception as e:
            print(f"Notice: clinical catalogs check: {e}")

        # 15. Diagnostic Lab Orders & Lab Results (clinical_orders & lab_values)
        lab_orders_data = [
            # Order 1: Isaac G. E. - Resulted
            {
                "pat": isaac,
                "ref": "20261101",
                "name": "HUH-Cardio Diabetic (16 Tests)",
                "status": "Resulted",
                "days": 18,
                "notes_patient": "Fasting sample collected at 08:30 AM. Overnight fast (12 hours).",
                "notes_intra": "High priority review for EECP qualification.",
                "reviewed": True,
                "values": [
                    ("Calcium", "Calcium", "9.4", "mg/dL", "8.6 - 10.2", "Normal", "Normal serum calcium."),
                    ("Magnesium", "Magnesium", "2.1", "mg/dL", "1.6 - 2.6", "Normal", "Normal serum magnesium."),
                    ("Apolipoprotein-A1", "Apolipoprotein-A1", "138", "mg/dL", "111.0 - 184.0", "Normal", "Desirable cardio-protective level."),
                    ("Apolipoprotein-B", "Apolipoprotein-B", "124", "mg/dL", "81.0 - 156.0", "Normal", "Acceptable atherogenic particle count."),
                    ("Fasting Blood Sugar", "Fasting Blood Sugar", "106", "mg/dL", "70.0 - 100.0", "High", "Impaired fasting glucose."),
                    ("Postprandial Blood Sugar", "Postprandial Sugar", "136", "mg/dL", "70.0 - 140.0", "Normal", "Within postprandial limits."),
                    ("HbA1c", "HbA1c", "6.7", "%", "4.0 - 5.6", "High", "Suboptimal long-term glycemic control."),
                    ("Total Cholesterol", "Total Cholesterol", "196", "mg/dL", "125.0 - 200.0", "Normal", "Borderline normal total cholesterol."),
                    ("Triglycerides", "Triglyceride", "168", "mg/dL", "50.0 - 150.0", "High", "Mild hypertriglyceridemia."),
                    ("HDL Cholesterol", "HDL Cholesterol", "42", "mg/dL", "40.0 - 60.0", "Normal", "Normal HDL protective fraction."),
                    ("LDL Cholesterol", "LDL Cholesterol", "120", "mg/dL", "50.0 - 100.0", "High", "Elevated LDL in high-risk cardiac patient."),
                    ("Blood Urea Nitrogen", "BUN", "14", "mg/dL", "7.0 - 20.0", "Normal", "Normal urea nitrogen."),
                    ("Serum Creatinine", "Creatinine", "0.95", "mg/dL", "0.7 - 1.3", "Normal", "Normal renal clearance."),
                    ("Glomerular Filtration Rate", "eGFR", "88", "mL/min/1.73m²", ">60.0", "Normal", "Preserved filtration function."),
                    ("Sodium", "Sodium", "141", "mEq/L", "135.0 - 145.0", "Normal", "Normal electrolyte."),
                    ("Chloride", "Chloride", "101", "mEq/L", "96.0 - 106.0", "Normal", "Normal electrolyte."),
                ]
            },
            # Order 2: Isaac G. E. - Resulted (Cardiac Biomarkers)
            {
                "pat": isaac,
                "ref": "20261102",
                "name": "HUH - Cardiac Biomarkers & Complete Hemogram",
                "status": "Resulted",
                "days": 16,
                "notes_patient": "Sample drawn after morning consultation.",
                "notes_intra": "Verify baseline NT-proBNP and Troponin I.",
                "reviewed": True,
                "values": [
                    ("Cardiac Troponin I", "Troponin I", "0.01", "ng/mL", "<0.04", "Normal", "Negative for acute myocardial necrosis."),
                    ("NT-proBNP", "NT-proBNP", "142", "pg/mL", "<300.0", "Normal", "Normal cardiac ventricular wall stress."),
                    ("hs-CRP", "hs-CRP", "1.9", "mg/L", "<1.0", "High", "Moderate systemic vascular inflammation."),
                    ("Haemoglobin", "Haemoglobin-Hb", "14.8", "g/dL", "13.0 - 17.0", "Normal", "Adequate oxygen-carrying capacity."),
                    ("Total WBC Count", "Total WBC Count", "6900", "cells/cumm", "4000.0 - 10000.0", "Normal", "Normal leukocyte count."),
                    ("Platelet Count", "Platelet Count", "248000", "cells/cumm", "150000 - 450000", "Normal", "Normal thrombocyte count."),
                ]
            },
            # Order 3: Aarav Demo - Partial Results
            {
                "pat": aarav,
                "ref": "20261103",
                "name": "HUH-Cardio Diabetic Profile",
                "status": "Partial",
                "days": 8,
                "notes_patient": "Fasting blood sample collected.",
                "notes_intra": "Awaiting final HbA1c verification.",
                "reviewed": False,
                "values": [
                    ("Total Cholesterol", "Total Cholesterol", "224", "mg/dL", "125.0 - 200.0", "High", "Significant hypercholesterolemia."),
                    ("Triglycerides", "Triglyceride", "188", "mg/dL", "50.0 - 150.0", "High", "Elevated triglycerides."),
                    ("HDL Cholesterol", "HDL Cholesterol", "36", "mg/dL", "40.0 - 60.0", "Low", "Sub-optimal cardio-protective HDL."),
                    ("LDL Cholesterol", "LDL Cholesterol", "150", "mg/dL", "50.0 - 100.0", "High", "Markedly elevated atherogenic LDL."),
                    ("Fasting Blood Sugar", "Fasting Blood Sugar", "116", "mg/dL", "70.0 - 100.0", "High", "Hyperglycemia."),
                ]
            },
            # Order 4: Dev Example - Pending
            {
                "pat": dev,
                "ref": "20261104",
                "name": "HUH - Renal Function & Electrolyte Review",
                "status": "Pending",
                "days": 1,
                "notes_patient": "Please report to lab on empty stomach tomorrow morning.",
                "notes_intra": "Check potassium and creatinine before titrating ACE inhibitor.",
                "reviewed": False,
                "values": []
            },
            # Order 5: Mira Sample - Resulted
            {
                "pat": mira,
                "ref": "20261105",
                "name": "HUH - Lipid Profile & Thyroid Screening",
                "status": "Resulted",
                "days": 12,
                "notes_patient": "Routine 12-hour fasting sample.",
                "notes_intra": "Rule out secondary dyslipidemia due to thyroid dysfunction.",
                "reviewed": True,
                "values": [
                    ("Total Cholesterol", "Total Cholesterol", "210", "mg/dL", "125.0 - 200.0", "High", "Mild hypercholesterolemia."),
                    ("Triglycerides", "Triglyceride", "125", "mg/dL", "50.0 - 150.0", "Normal", "Normal triglycerides."),
                    ("HDL Cholesterol", "HDL Cholesterol", "52", "mg/dL", "40.0 - 60.0", "Normal", "Healthy HDL level."),
                    ("LDL Cholesterol", "LDL Cholesterol", "133", "mg/dL", "50.0 - 100.0", "High", "Mildly elevated LDL."),
                    ("TSH", "TSH", "2.4", "uIU/mL", "0.4 - 4.2", "Normal", "Euthyroid state confirmed."),
                ]
            }
        ]

        for odef in lab_orders_data:
            pat = odef["pat"]
            order_date_str = (today_date - timedelta(days=odef["days"])).strftime("%d-%b-%Y")
            existing_ord = db.query(m.ClinicalOrder).filter_by(patient_id=pat.id, lab_ref=odef["ref"]).first()

            if not existing_ord:
                order = m.ClinicalOrder(
                    **rec_common(pat, odef["days"]),
                    kind="Lab",
                    name=odef["name"],
                    instructions="Laboratory evaluation according to standard clinical protocol.",
                    status=odef["status"],
                    result=f"Official laboratory report processed for {pat.first_name} {pat.last_name}.",
                    reviewed_by=doc.id if odef["reviewed"] else None,
                    reviewed_at=now_utc - timedelta(days=odef["days"] - 1) if odef["reviewed"] else None,
                    lab_ref=odef["ref"],
                    ordered_date=order_date_str,
                    notes_lab_patient=odef["notes_patient"],
                    notes_intra_office=odef["notes_intra"],
                    order_metadata=json.dumps({
                        "template_name": odef["name"],
                        "tests": [v[0] for v in odef["values"]],
                        "specimen": {
                            "date": str(today_date - timedelta(days=odef["days"])),
                            "time": "08:30",
                            "type": "Blood (Serum)",
                            "site": "Left antecubital fossa",
                            "volume": "5 mL",
                            "fasting": True
                        }
                    })
                )
                db.add(order)
                db.flush()

                # Add Lab Values
                for tname, param, val, unit, ref_range, interp, comm in odef["values"]:
                    db.add(m.LabValue(
                        order_id=order.id,
                        test_name=tname,
                        parameter=param,
                        value=val,
                        unit=unit,
                        reference_range=ref_range,
                        interpretation=interp,
                        comments=comm
                    ))
        db.flush()
        print("Restored 5 comprehensive diagnostic lab orders with full biomarker values across patients.")

        # 16. Cardiology Imaging Orders (kind='Image')
        imaging_orders_data = [
            (isaac, "IMG-2026-001", "ECHO · 2D Echocardiography with Color Doppler [ 93306 ]", "Signed", 20,
             "2D Echocardiography & Color Doppler Study Report:\n- Left Ventricular Internal Dimensions: LVEDD 48mm, LVESD 31mm\n- Left Ventricular Ejection Fraction (LVEF): 55-60% by Simpson's biplane method\n- Regional Wall Motion: Normal global LV systolic function at rest. No overt regional dyskinesia.\n- Diastolic Function: Grade 1 LV diastolic dysfunction (impaired relaxation, E/A ratio 0.8).\n- Left Atrium: Mild LA enlargement (LA volume index 36 mL/m²).\n- Right Ventricle & Valves: Normal RV size and function (TAPSE 22mm). Trivial mitral and tricuspid regurgitation.\n- Pericardium: Normal, no pericardial effusion.\n- Conclusion: Good resting LV systolic function (EF 58%). Suitable hemodynamic candidate for EECP therapy."),

            (isaac, "IMG-2026-002", "ECG · 12-Lead Electrocardiogram with Interpretation [ 93000 ]", "Signed", 20,
             "12-Lead Electrocardiogram Interpretation:\n- Rhythm: Normal Sinus Rhythm\n- Heart Rate: 72 beats per minute\n- PR Interval: 160 ms (Normal)\n- QRS Duration: 88 ms (Normal)\n- QTc: 418 ms (Normal)\n- Axis: Normal (+45 degrees)\n- Waveform Analysis: Non-specific ST segment flattening in inferior leads (III, aVF). No acute ischemic ST segment elevation or deep Q waves.\n- Conclusion: Normal sinus rhythm with stable chronic repolarization changes."),

            (aarav, "IMG-2026-003", "Tread Mill Stress Test · TMT - Bruce Protocol [ 93015 ]", "Signed", 14,
             "Exercise Treadmill Stress Test (TMT) - Bruce Protocol:\n- Protocol: Standard Bruce Protocol\n- Exercise Duration: 8 minutes 40 seconds (Stage 3 achieved)\n- Workload: 8.5 METs\n- Baseline BP & HR: 130/84 mmHg, 76 bpm\n- Peak Exercise BP & HR: 172/90 mmHg, 146 bpm (88% of Age-Predicted Maximum Heart Rate)\n- Symptoms: Mild retrosternal tightness experienced at 8 mins, resolved during cool-down.\n- ECG Findings: 0.8 mm horizontal ST depression in leads V4-V6 at peak stress, normalizing within 3 mins of recovery.\n- Conclusion: Positive for exercise-induced reversible myocardial ischemia at moderate workload (8.5 METs). High suitability for EECP non-invasive revascularization."),

            (dev, "IMG-2026-004", "Angiogram · Coronary Angiogram with Left Heart Catheterization [ 93458 ]", "Signed", 35,
             "Coronary Angiography Review:\n- LMCA: Normal, no stenosis.\n- LAD: Patent drug-eluting stent in proximal segment with 0% in-stent restenosis, TIMI 3 flow. Mild luminal irregularities in distal segment.\n- LCx: 40% eccentric plaque in mid circumflex artery.\n- RCA: Dominant vessel with diffuse 30-40% non-flow limiting atherosclerotic plaque.\n- Impression: Patent LAD stent. Non-obstructive coronary artery disease elsewhere.")
        ]

        for pat, img_ref, name, status, days, res_report in imaging_orders_data:
            existing_img = db.query(m.ClinicalOrder).filter_by(patient_id=pat.id, lab_ref=img_ref).first()
            if not existing_img:
                db.add(m.ClinicalOrder(
                    **rec_common(pat, days),
                    kind="Image",
                    name=name,
                    instructions="Cardiology diagnostic imaging study.",
                    status=status,
                    result=res_report,
                    reviewed_by=doc.id,
                    reviewed_at=now_utc - timedelta(days=days - 1),
                    lab_ref=img_ref,
                    ordered_date=(today_date - timedelta(days=days)).strftime("%d-%b-%Y"),
                    notes_lab_patient="Report and digital study archived in EHR.",
                    notes_intra_office="Correlate with clinical response to EECP.",
                    order_metadata=json.dumps({"imaging_test": name, "verified": True})
                ))
        db.flush()
        print("Restored cardiology imaging orders & diagnostic studies (Echo, ECG, TMT, Angiogram).")

        # 17. Calendar Appointments (Past, Today, Upcoming)
        appts_data = [
            # Today's appointments (checked-in & confirmed)
            (isaac, doc.id, 0, 9, 30, "Follow-up", "checked-in", "Weekly cardiology progress review and prescription refill."),
            (isaac, therapist.id if therapist else doc.id, 0, 11, 60, "EECP session", "confirmed", "Daily EECP counterpulsation session 16."),
            (aarav, doc.id, 0, 10, 30, "Consultation", "checked-in", "Review of lab results and symptom diary."),
            (dev, doc.id, 0, 14, 30, "Follow-up", "confirmed", "Post-medication titration review."),
            (mira, doc.id, 0, 15, 30, "New consultation", "confirmed", "Evaluation of exertional breathlessness."),

            # Upcoming appointments (Tomorrow & Friday)
            (isaac, therapist.id if therapist else doc.id, 1, 11, 60, "EECP session", "confirmed", "EECP Session 17."),
            (isaac, therapist.id if therapist else doc.id, 2, 11, 60, "EECP session", "confirmed", "EECP Session 18."),
            (aarav, therapist.id if therapist else doc.id, 1, 10, 60, "EECP session", "confirmed", "EECP Session 8."),
            (dev, doc.id, 3, 11, 30, "Follow-up", "confirmed", "Renal function check."),

            # Past completed visits
            (isaac, doc.id, -7, 10, 30, "Follow-up", "completed", "Mid-course review."),
            (isaac, doc.id, -20, 9, 45, "New consultation", "completed", "Initial baseline evaluation."),
            (aarav, doc.id, -10, 11, 30, "Consultation", "completed", "Initial baseline visit."),
        ]

        consult_room = db.query(m.Resource).filter(m.Resource.facility_id == fac_hyn.id, m.Resource.kind == "Consultation room").first()
        for pat, prov_id, day_offset, hour, duration_mins, vtype, status, reason in appts_data:
            target_date = today_date + timedelta(days=day_offset)
            start_dt = datetime.combine(target_date, datetime.min.time()).replace(hour=hour)
            end_dt = start_dt + timedelta(minutes=duration_mins)

            existing_appt = db.query(m.Appointment).filter(
                (m.Appointment.patient_id == pat.id) & (m.Appointment.start_at == start_dt)
            ).first()

            if not existing_appt:
                db.add(m.Appointment(
                    **rec_common(pat, -day_offset if day_offset < 0 else 0),
                    provider_id=prov_id,
                    resource_id=consult_room.id if consult_room else None,
                    start_at=start_dt,
                    end_at=end_dt,
                    visit_type=vtype,
                    mode="In person",
                    status=status,
                    reason=reason,
                    checked_in_at=start_dt if status == "checked-in" else None
                ))
        db.flush()
        print("Restored provider calendar appointments across today, upcoming, and past visits.")

        # 18. Tasks and Patient Entries
        tasks_data = [
            (isaac, doc.id, "Review repeat lipid & HbA1c panel", "Verify LDL reduction on Atorva 20mg and assess glucose control.", today_date + timedelta(days=2), "high"),
            (isaac, therapist.id if therapist else doc.id, "Monitor EECP D/S ratio trend", "Ensure augmentation pressure exceeds 260 mmHg consistently.", today_date + timedelta(days=5), "normal"),
            (aarav, doc.id, "Follow-up on TMT stress test report", "Discuss exercise prescription and EECP scheduling.", today_date + timedelta(days=1), "normal"),
            (dev, reception.id if reception else doc.id, "Confirm transport arrangement for daily EECP", "Call patient caregiver to verify morning pickup schedule.", today_date, "urgent"),
        ]

        for pat, assignee_id, title, body, due, priority in tasks_data:
            if not db.query(m.Task).filter_by(patient_id=pat.id, title=title).first():
                db.add(m.Task(
                    **rec_common(pat, 0),
                    kind="task",
                    title=title,
                    body=body,
                    assignee_id=assignee_id,
                    due_date=due,
                    priority=priority,
                    status="pending"
                ))

        patient_entries_data = [
            (isaac, "alert", "Penicillin Allergy Alert", "High risk of severe anaphylactoid reaction. Do not administer beta-lactam antibiotics."),
            (isaac, "quick note", "Cardiac Rehabilitation Goal", "Aiming for 45 minutes continuous aerobic walking and NYHA Class I functional capacity post 35 sessions."),
            (aarav, "alert", "Elevated Atherogenic Risk", "Statin titration indicated based on LDL 150 mg/dL."),
        ]

        for pat, kind, title, content in patient_entries_data:
            if not db.query(m.PatientEntry).filter_by(patient_id=pat.id, title=title).first():
                db.add(m.PatientEntry(
                    **rec_common(pat, 10),
                    kind=kind,
                    title=title,
                    content=content,
                    status="active"
                ))
        db.flush()
        print("Restored clinical tasks and alert entries.")

        # 19. Invoices and Ledger
        invoices_data = [
            (isaac, "HYN-INV-000101", 12250000, "paid", [("EECP-35", "EECP 35-Session Comprehensive Package", 1, 12250000)]),
            (isaac, "HYN-INV-000102", 150000, "paid", [("CONSULT", "Comprehensive Cardiology Consultation", 1, 150000)]),
            (aarav, "HYN-INV-000103", 150000, "paid", [("CONSULT", "Cardiology Consultation & Assessment", 1, 150000)]),
            (dev, "HYN-INV-000104", 350000, "unpaid", [("EECP-1", "EECP Single Assessment Session", 1, 350000)]),
        ]

        for pat, inv_num, total, st, lines in invoices_data:
            existing_inv = db.query(m.Invoice).filter_by(number=inv_num).first()
            if not existing_inv:
                inv = m.Invoice(
                    **rec_common(pat, 15),
                    number=inv_num,
                    discount_paise=0,
                    total_paise=total,
                    status=st
                )
                db.add(inv)
                db.flush()

                for code, desc, qty, unit_paise in lines:
                    db.add(m.InvoiceLine(
                        invoice_id=inv.id,
                        code=code,
                        description=desc,
                        quantity=qty,
                        unit_paise=unit_paise
                    ))

                if st == "paid":
                    db.add(m.Payment(
                        invoice_id=inv.id,
                        receipt_number=f"REC-{inv_num[-6:]}",
                        amount_paise=total,
                        mode="UPI",
                        actor_id=billing.id if billing else admin.id,
                        idempotency_key=f"pay-{inv.id}",
                        simulated=True
                    ))
        db.flush()
        print("Restored billing invoices, line items, and payment receipts.")

        # Commit all changes to disk
        db.commit()
        print("\n>>> FULL CLINICAL EHR DATABASE RESTORATION COMPLETED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_restoration()


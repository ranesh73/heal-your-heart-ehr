"""
PHR (Patient Health Record) Service & Seed Data.
Manages PHR settings, patient accounts, sessions, and clinical data aggregation for Heal Your Heart PHR.
"""
import hashlib
import json
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import select, desc, or_, and_, delete
from sqlalchemy.orm import Session

from . import models as m
from .db import DATA_DIR

logger = logging.getLogger("ehr.phr")

DEFAULT_MODULES = {
    "clinical_summary": True,
    "visit_summary": True,
    "appointments": True,
    "billing": True,
    "questionnaire": True,
    "announcements": True,
    "messages": True,
}

DEFAULT_MESSAGING_PREFS = {
    "patient_category": "All Patients",
    "allow_patient_messages": True,
    "restrict_message_count": False,
    "max_chars": 500,
    "allow_share_documents": True,
    "allow_to": "both",  # 'groups', 'members', 'both'
    "recipients": "all",  # 'all', 'care_team'
    "excluded_member_ids": [
        "Vanitha M",
        "Rabini M",
        "Susan Sekar",
        "Jamuna M",
        "Sarala D",
        "Vijayalakshmi K",
        "Dr. Elakkiya M",
    ],
}

DEFAULT_SHARED_CLINICAL_SECTIONS = {
    "smoking_status": True,
    "procedures": True,
    "diagnoses": True,
    "medications": True,
    "allergies": True,
    "vitals": True,
    "growth_chart": False,
    "vaccines": True,
    "implanted_devices": True,
    "goals": True,
    "health_concerns": True,
    "care_team": True,
}

DEFAULT_REFILL_PREFS = {
    "allow_rx_refill": True,
    "allow_supplement_refill": True,
    "notify_provider": True,
    "notify_other_member_ids": ["Dr. Prem Sekar", "Dr. Ramasamy S"],
}

DEFAULT_PRACTICE_PREFS = {
    "in_house_care_team_only_booking": False,
    "shared_data_notification_members_by_facility": {
        "HUH001": ["Dr. Prem Sekar", "Sarala D"],
        "HUH002": ["Dr. Ramasamy S", "Nathiya"],
        "HUH003": ["Dr. Prem Sekar"],
        "004": ["Dr. Prem Sekar"],
        "005": ["Dr. Ramasamy S"],
    },
}

DEFAULT_CUSTOM_APP_MENU = {
    "app_name": "Heal Your Heart PHR",
    "sub_tabs": ["MAIN MENU", "MAPS", "ABOUT", "LOGIN", "APP DETAILS"],
    "menu_items": {
        "appointments": True,
        "messages": True,
        "document": True,
        "questionnaire": True,
        "medications": True,
        "lab_results": True,
        "billing": True,
        "visit_summary": True,
        "announcements": True,
        "useful_info": True,
        "about": True,
    },
}

FACILITIES_CONFIG = [
    {
        "id": "HUH001",
        "name": "Heal Your Heart Neelankarai - HUH001",
        "code": "HUH001",
        "address": "No. 14, East Coast Road, Neelankarai, Chennai 600115",
        "phone": "+91 98401 23456",
        "embed_code": '<a href="https://ehr.healyourheart.in/phr/login?facility_id=HUH001" target="_blank" class="hyh-portal-btn">Patient Portal</a>',
    },
    {
        "id": "HUH002",
        "name": "Heal Your Heart Royapettah - HUH002",
        "code": "HUH002",
        "address": "New No. 12, Westcott Road, Royapettah, Chennai 600014",
        "phone": "+91 98402 34567",
        "embed_code": '<a href="https://ehr.healyourheart.in/phr/login?facility_id=HUH002" target="_blank" class="hyh-portal-btn">Patient Portal</a>',
    },
    {
        "id": "4R",
        "name": "4R Health & Wellness",
        "code": "4R",
        "address": "Adyar, Chennai 600020",
        "phone": "+91 98403 45678",
        "embed_code": '<a href="https://ehr.healyourheart.in/phr/login?facility_id=4R" target="_blank" class="hyh-portal-btn">Patient Portal</a>',
    },
    {
        "id": "HUH003",
        "name": "Heal Your Heart - Manapakkam - HUH003",
        "code": "HUH003",
        "address": "Mount Poonamallee Road, Manapakkam, Chennai 600125",
        "phone": "+91 98404 56789",
        "embed_code": '<a href="https://ehr.healyourheart.in/phr/login?facility_id=HUH003" target="_blank" class="hyh-portal-btn">Patient Portal</a>',
    },
    {
        "id": "005",
        "name": "Heal Your Heart-Madurai - 005",
        "code": "005",
        "address": "KK Nagar, Madurai 625020",
        "phone": "+91 98405 67890",
        "embed_code": '<a href="https://ehr.healyourheart.in/phr/login?facility_id=005" target="_blank" class="hyh-portal-btn">Patient Portal</a>',
    },
    {
        "id": "004",
        "name": "Heal Your Heart-Tirunelveli - 004",
        "code": "004",
        "address": "South Bypass Road, Tirunelveli 627005",
        "phone": "+91 98406 78901",
        "embed_code": '<a href="https://ehr.healyourheart.in/phr/login?facility_id=004" target="_blank" class="hyh-portal-btn">Patient Portal</a>',
    },
]


def hash_pin_or_password(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_or_create_phr_settings(db: Session) -> m.PhrSetting:
    setting = db.scalar(select(m.PhrSetting).limit(1))
    if not setting:
        setting = m.PhrSetting(
            id=1,
            modules_json=json.dumps(DEFAULT_MODULES),
            messaging_prefs_json=json.dumps(DEFAULT_MESSAGING_PREFS),
            shared_clinical_sections_json=json.dumps(DEFAULT_SHARED_CLINICAL_SECTIONS),
            refill_prefs_json=json.dumps(DEFAULT_REFILL_PREFS),
            practice_prefs_json=json.dumps(DEFAULT_PRACTICE_PREFS),
            custom_app_menu_json=json.dumps(DEFAULT_CUSTOM_APP_MENU),
            updated_at=m.now(),
        )
        db.add(setting)
        db.commit()
    return setting


def ensure_phr_seed_data(db: Session):
    """
    Seeds default PHR settings, useful info, announcements, and demo patient Hariharan S.
    """
    try:
        # 1. Settings
        get_or_create_phr_settings(db)

        # 2. Useful Info
        existing_info = db.scalars(select(m.PhrUsefulInfo)).all()
        if not existing_info:
            seed_infos = [
                ("Heal Your Heart 24/7 Cardiac Helpline", "Contact", "+91 98401 23456 / 044-24491122", 1),
                ("Emergency & Ambulance Service (Chennai)", "Contact", "108 / +91 98402 34567", 2),
                (
                    "EECP Treatment Protocol & Pre-Therapy Guidelines",
                    "Policy",
                    "Patients must avoid heavy meals 2 hours before EECP. Wear comfortable cotton stretch pants. Maintain adequate hydration before every counterpulsation session.",
                    3,
                ),
                (
                    "EECP Clinical Evidence & Research Papers (ACC/AHA)",
                    "Link",
                    "https://healyourheart.in/eecp-research",
                    4,
                ),
                (
                    "Patient Portal Privacy & Medical Records Policy",
                    "Policy",
                    "All diagnostic reports, ECGs, and Echo records in Heal Your Heart PHR are encrypted end-to-end and HIPAA/DISHA compliant.",
                    5,
                ),
            ]
            for title, cat, content, order in seed_infos:
                db.add(
                    m.PhrUsefulInfo(
                        id=str(uuid4()),
                        title=title,
                        category=cat,
                        content_or_url=content,
                        display_order=order,
                        is_active=True,
                        created_at=m.now(),
                    )
                )
            db.commit()

        # 3. Announcements
        existing_announcements = db.scalars(select(m.PhrAnnouncement)).all()
        if not existing_announcements:
            seed_announcements = [
                (
                    "Important Health Update from Heal Your Heart: Monsoon Cardiac Wellness Check",
                    "Dear Patients, seasonal temperature drops can cause peripheral vasoconstriction and elevated blood pressure. Please monitor your morning BP and attend your scheduled EECP sessions regularly.",
                    m.now(),
                ),
                (
                    "New High-Precision Digital SphygmoCor & Echo Available at Neelankarai",
                    "Advanced central aortic systolic pressure and non-invasive arterial stiffness diagnostics are now active at our flagship center.",
                    m.now() - timedelta(days=1),
                ),
                (
                    "Online Rx Refills and Document Sharing Now Live on Heal Your Heart PHR",
                    "You can now request prescription refills and upload your external cardiac hospital reports directly from your mobile phone.",
                    m.now() - timedelta(days=3),
                ),
            ]
            for title, body, pub_at in seed_announcements:
                db.add(
                    m.PhrAnnouncement(
                        id=str(uuid4()),
                        title=title,
                        body=body,
                        published_at=pub_at,
                        created_at=m.now(),
                    )
                )
            db.commit()

        # 4. Patient Account: Hariharan S
        patient = db.scalar(select(m.Patient).where(m.Patient.first_name == "Hariharan"))
        facility = db.scalar(select(m.Facility))
        doctor = db.scalar(select(m.User).where(m.User.role == "doctor"))

        if not patient:
            mrn = "HYN-MR-000172"
            if db.scalar(select(m.Patient.id).where(m.Patient.mrn == mrn)):
                mrn = f"HYN-MR-{str(uuid4())[:6].upper()}"
            patient_id = str(uuid4())
            patient = m.Patient(
                id=patient_id,
                mrn=mrn,
                first_name="Hariharan",
                last_name="S",
                dob=date(2003, 5, 14),  # 23 Years old
                sex="Male",
                phone="+91 98407 12345",
                email="hariharan.s@example.com",
                address="No. 14, East Coast Road, Neelankarai, Chennai 600115",
                primary_facility_id=facility.id if facility else None,
                provider_id=doctor.id if doctor else None,
                version=1,
            )
            db.add(patient)
            db.flush()

            # Link patient facility
            if facility:
                db.add(m.PatientFacility(patient_id=patient.id, facility_id=facility.id))

        # Ensure PHR Account for Hariharan S
        phr_acc = db.scalar(select(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == patient.id))
        if not phr_acc:
            db.add(
                m.PatientPhrAccount(
                    id=str(uuid4()),
                    patient_id=patient.id,
                    phone_or_email=patient.email or patient.phone or "hariharan.s@example.com",
                    password_hash=hash_pin_or_password("password123"),
                    pin_hash=hash_pin_or_password("1234"),  # 4-digit PIN default 1234
                    is_active=True,
                    created_at=m.now(),
                )
            )

        # Seed Vitals for Hariharan if none exist
        vital = db.scalar(select(m.Vital).where(m.Vital.patient_id == patient.id))
        if not vital:
            db.add(
                m.Vital(
                    id=str(uuid4()),
                    patient_id=patient.id,
                    facility_id=facility.id if facility else None,
                    author_id=doctor.id if doctor else None,
                    weight_kg=74.0,
                    height_cm=175.0,
                    bp_sys=122.0,
                    bp_dia=78.0,
                    pulse_bpm=72.0,
                    observed_at=m.now(),
                    created_at=m.now(),
                    version=1,
                )
            )

        # Seed Upcoming Appointment for Hariharan
        apt = db.scalar(
            select(m.Appointment).where(
                (m.Appointment.patient_id == patient.id) &
                (m.Appointment.start_at >= m.now() - timedelta(hours=1))
            )
        )
        if not apt and facility and doctor:
            tomorrow_10am = datetime.now().replace(hour=10, minute=30, second=0, microsecond=0) + timedelta(days=1)
            db.add(
                m.Appointment(
                    id=str(uuid4()),
                    patient_id=patient.id,
                    facility_id=facility.id,
                    provider_id=doctor.id,
                    author_id=doctor.id,
                    start_at=tomorrow_10am,
                    end_at=tomorrow_10am + timedelta(minutes=30),
                    visit_type="EECP Follow-Up Consultation",
                    status="confirmed",
                    created_at=m.now(),
                    version=1,
                )
            )

        # Seed a sample Medication / Prescription for Hariharan
        med = db.scalar(select(m.Medication).where(m.Medication.patient_id == patient.id))
        if not med:
            db.add(
                m.Medication(
                    id=str(uuid4()),
                    patient_id=patient.id,
                    facility_id=facility.id if facility else None,
                    author_id=doctor.id if doctor else None,
                    trade_name="Atorvastatin 20mg",
                    generic_name="Atorvastatin",
                    dose="20mg",
                    route="Oral",
                    frequency="Once daily at bedtime",
                    maen="0-0-0-1",
                    duration_days=30,
                    quantity=30,
                    instructions="Take 1 tablet at bedtime.",
                    status="active",
                    created_at=m.now(),
                    version=1,
                )
            )
            db.add(
                m.Medication(
                    id=str(uuid4()),
                    patient_id=patient.id,
                    facility_id=facility.id if facility else None,
                    author_id=doctor.id if doctor else None,
                    trade_name="CoQ10 Heart Health Complex",
                    generic_name="Coenzyme Q10",
                    dose="100mg",
                    route="Oral",
                    frequency="Twice daily after meals",
                    maen="1-0-1-0",
                    duration_days=30,
                    quantity=60,
                    instructions="Take 1 capsule twice daily with meals.",
                    status="active",
                    created_at=m.now(),
                    version=1,
                )
            )

        # Seed sample Diagnostic Image Order with ECG result
        img_order = db.scalar(
            select(m.ClinicalOrder).where(
                (m.ClinicalOrder.patient_id == patient.id) &
                (m.ClinicalOrder.kind.in_(["Image", "Imaging"]))
            )
        )
        if not img_order and facility and doctor:
            order_id = str(uuid4())
            order = m.ClinicalOrder(
                id=order_id,
                patient_id=patient.id,
                facility_id=facility.id,
                author_id=doctor.id,
                kind="Image",
                name="ECG : Resting (12-Lead)",
                status="Completed",
                result="Normal sinus rhythm. Heart rate 72 bpm. PR interval 150 ms. Normal axis and QRS duration. No acute ST-T changes.",
                ordered_date=m.now().strftime("%Y-%m-%d"),
                created_at=m.now(),
                version=1,
            )
            db.add(order)
            db.flush()

            # Add document record
            storage_key = str(uuid4())
            (DATA_DIR / "documents").mkdir(parents=True, exist_ok=True)
            doc_file = DATA_DIR / "documents" / storage_key
            doc_file.write_bytes(b"%PDF-1.4 Mock ECG Diagnostic Scan Report")
            db.add(
                m.Document(
                    id=str(uuid4()),
                    patient_id=patient.id,
                    facility_id=facility.id,
                    author_id=doctor.id,
                    title="ECG Report - Resting 12-Lead",
                    filename="20261117-002208-000207.pdf",
                    storage_key=storage_key,
                    mime="application/pdf",
                    size=len(doc_file.read_bytes()),
                    sha256=hashlib.sha256(doc_file.read_bytes()).hexdigest(),
                    order_id=order.id,
                    created_at=m.now(),
                    version=1,
                )
            )

        db.commit()
        logger.info("PHR seed data verified and loaded successfully.")
    except Exception as e:
        logger.warning(f"Error ensuring PHR seed data: {e}")
        db.rollback()

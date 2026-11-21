import os
import hashlib
from datetime import timedelta, date
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, delete

from app.main import app
from app.db import SessionLocal
from app import models as m
from app.security import digest
from app.phr_service import ensure_phr_seed_data, extract_6digit_patient_id

client = TestClient(app)


def get_staff_auth():
    db = SessionLocal()
    try:
        doctor = db.scalar(select(m.User).where(m.User.role == "doctor"))
        facility = db.scalar(select(m.Facility))
        if not doctor:
            doctor = m.User(
                id=str(uuid4()),
                email="dr.prem@healyourheart.in",
                name="Dr. Prem Sekar",
                role="doctor",
                active=True,
                password_hash="test",
            )
            db.add(doctor)
            db.commit()
        if facility and not db.get(m.UserFacility, (doctor.id, facility.id)):
            db.add(m.UserFacility(user_id=doctor.id, facility_id=facility.id))
            db.commit()

        raw_token = "staff-test-token-" + str(uuid4())
        csrf_token = "csrf-" + str(uuid4())
        session = m.StaffSession(
            token_hash=digest(raw_token),
            csrf=csrf_token,
            user_id=doctor.id,
            expires_at=m.now() + timedelta(hours=8),
        )
        db.add(session)
        db.commit()
        return {
            "Authorization": f"Bearer {raw_token}",
            "X-CSRF-Token": csrf_token,
            "X-Facility-ID": facility.id if facility else "",
        }
    finally:
        db.close()


@pytest.fixture(autouse=True)
def seed_phr():
    db = SessionLocal()
    try:
        ensure_phr_seed_data(db)
    finally:
        db.close()


def test_phr_public_config():
    resp = client.get("/api/phr/public-config")
    assert resp.status_code == 200
    data = resp.json()
    assert "brand_name" in data
    assert "Heal Your Heart" in data["brand_name"]
    assert "facilities" in data
    assert len(data["facilities"]) >= 6


def test_phr_unlock_and_dashboard():
    # 1. Unlock with PIN
    resp = client.post("/api/phr/auth/unlock", json={"pin": "1234"})
    assert resp.status_code == 200
    auth_data = resp.json()
    assert auth_data["authenticated"] is True
    assert "token" in auth_data
    token = auth_data["token"]

    headers = {"Authorization": f"Bearer {token}", "X-PHR-Token": token}

    # 2. Get me
    me_resp = client.get("/api/phr/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert "patient" in me_resp.json()

    # 3. Get Dashboard
    dash_resp = client.get("/api/phr/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "vitals" in dash_data
    assert "upcoming_appointments" in dash_data


def test_phr_appointment_request():
    headers = {"X-PHR-Token": "demo-token"}
    payload = {
        "facility_name": "Heal Your Heart Neelankarai - HUH001",
        "provider_name": "Dr. Prem Sekar",
        "preferred_date": "2026-11-25",
        "preferred_time_slot": "Morning (09:00 AM - 12:00 PM)",
        "reason": "Cardiology EECP Consultation",
    }
    resp = client.post("/api/phr/appointments/request", json=payload, headers=headers)
    assert resp.status_code == 200
    res = resp.json()
    assert res["status"] == "pending"


def test_phr_messaging():
    headers = {"X-PHR-Token": "demo-token"}
    payload = {
        "body": "Hello Doctor, what is the ideal schedule for my remaining EECP sessions?",
        "recipient_role": "Doctor",
    }
    resp = client.post("/api/phr/messages", json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"

    get_resp = client.get("/api/phr/messages", headers=headers)
    assert get_resp.status_code == 200
    msgs = get_resp.json()["messages"]
    assert any("EECP sessions" in m["body"] for m in msgs)


def test_phr_refill_request():
    headers = {"X-PHR-Token": "demo-token"}
    payload = {
        "medication_name": "Tab. Atorvastatin 20mg",
        "preferred_facility": "Heal Your Heart Neelankarai - HUH001",
        "delivery_notes": "Courier to home address",
    }
    resp = client.post("/api/phr/refills/request", json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "requested"


def test_phr_useful_info_and_announcements():
    resp_info = client.get("/api/phr/useful-info")
    assert resp_info.status_code == 200
    assert len(resp_info.json()["items"]) >= 1

    resp_ann = client.get("/api/phr/announcements")
    assert resp_ann.status_code == 200
    assert len(resp_ann.json()["announcements"]) >= 1


def test_phr_access_1click_activation_workflow():
    staff_headers = get_staff_auth()

    # 1. Create a fresh test patient
    db = SessionLocal()
    try:
        facility = db.scalar(select(m.Facility))
        test_patient = db.scalar(select(m.Patient).where(m.Patient.mrn == "HYN-MR-000555"))
        if not test_patient:
            test_patient = m.Patient(
                id=str(uuid4()),
                mrn="HYN-MR-000555",
                first_name="Isaac",
                last_name="Newton",
                dob=date(1980, 1, 1),
                sex="Male",
                primary_facility_id=facility.id if facility else "fac-1",
                email="isaac.newton@demo.local",
                phone="+91 98401 99999",
                active=True,
            )
            db.add(test_patient)
            if facility:
                db.add(m.PatientFacility(patient_id=test_patient.id, facility_id=facility.id))
            db.commit()
        else:
            test_patient.email = "isaac.newton@demo.local"
            db.execute(delete(m.PatientPhrSession).where(m.PatientPhrSession.patient_id == test_patient.id))
            db.execute(delete(m.PatientPhrAccount).where(m.PatientPhrAccount.patient_id == test_patient.id))
            db.commit()
        patient_id = test_patient.id
    finally:
        db.close()

    # 2. Check PHR access status before enabling
    status_resp = client.get(f"/api/patients/{patient_id}/phr-access", headers=staff_headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["enabled"] is False
    assert status_data["patient_id_6digit"] == "000555"
    assert status_data["login_url"] == "/phr/login"

    # 3. 1-Click Enable PHR Access
    enable_resp = client.post(f"/api/patients/{patient_id}/phr-access/enable", headers=staff_headers)
    assert enable_resp.status_code == 200
    enable_data = enable_resp.json()
    assert enable_data["enabled"] is True
    assert enable_data["default_password"] == "000555"
    assert enable_data["email"] == "isaac.newton@demo.local"

    # 4. Verify patient can log in at /api/phr/auth/login using default 6-digit ID password
    login_resp = client.post("/api/phr/auth/login", json={
        "identifier": "isaac.newton@demo.local",
        "password": "000555",
    })
    assert login_resp.status_code == 200
    patient_auth = login_resp.json()
    assert "token" in patient_auth
    assert patient_auth["patient"]["first_name"] == "Isaac"
    assert patient_auth["is_default_password"] is True
    patient_token = patient_auth["token"]

    patient_headers = {
        "Authorization": f"Bearer {patient_token}",
        "X-PHR-Token": patient_token,
    }

    # 5. Change Password
    chg_resp = client.post("/api/phr/auth/change-password", json={
        "current_password": "000555",
        "new_password": "NewSecretPassword2026!",
    }, headers=patient_headers)
    assert chg_resp.status_code == 200
    assert chg_resp.json()["status"] == "ok"

    # 6. Verify old password fails and new password succeeds
    fail_login = client.post("/api/phr/auth/login", json={
        "identifier": "isaac.newton@demo.local",
        "password": "000555",
    })
    assert fail_login.status_code == 401

    succ_login = client.post("/api/phr/auth/login", json={
        "identifier": "isaac.newton@demo.local",
        "password": "NewSecretPassword2026!",
    })
    assert succ_login.status_code == 200
    assert succ_login.json()["is_default_password"] is False

    # 7. Reset password to 6-digit ID from EHR
    reset_resp = client.post(f"/api/patients/{patient_id}/phr-access/reset-password", headers=staff_headers)
    assert reset_resp.status_code == 200
    assert reset_resp.json()["default_password"] == "000555"

    # Verify 6-digit ID works again after reset
    reset_login = client.post("/api/phr/auth/login", json={
        "identifier": "isaac.newton@demo.local",
        "password": "000555",
    })
    assert reset_login.status_code == 200

    # 8. Revoke PHR access from EHR
    disable_resp = client.post(f"/api/patients/{patient_id}/phr-access/disable", headers=staff_headers)
    assert disable_resp.status_code == 200
    assert disable_resp.json()["enabled"] is False

    # 9. Verify revoked account receives 403 Forbidden
    blocked_login = client.post("/api/phr/auth/login", json={
        "identifier": "isaac.newton@demo.local",
        "password": "000555",
    })
    assert blocked_login.status_code == 403
    assert "disabled or has been revoked" in blocked_login.json()["detail"]


def test_phr_settings_admin_crud():
    staff_headers = get_staff_auth()

    # 1. Update Preferences
    pref_payload = {
        "modules": {
            "clinical_summary": True,
            "visit_summary": True,
            "appointments": True,
            "billing": True,
            "questionnaire": True,
            "announcements": True,
            "messages": True,
        },
        "messaging_prefs": {
            "patient_category": "All Patients",
            "allow_patient_messages": True,
            "restrict_message_count": False,
            "max_chars": 500,
            "allow_share_documents": True,
        },
    }
    resp1 = client.put("/api/settings/phr/preferences", json=pref_payload, headers=staff_headers)
    assert resp1.status_code == 200

    # 2. Update Share Clinical Data
    resp2 = client.put("/api/settings/phr/share-clinical-data", json={
        "shared_clinical_sections": {
            "smoking_status": True,
            "procedures": True,
            "diagnoses": True,
            "medications": True,
            "allergies": True,
            "vitals": True,
            "growth_chart": True,
            "vaccines": True,
            "implanted_devices": True,
            "goals": True,
            "health_concerns": True,
            "care_team": False,
        }
    }, headers=staff_headers)
    assert resp2.status_code == 200

    # 3. Update Custom App
    resp3 = client.put("/api/settings/phr/custom-app", json={
        "menu_items": {"appointments": True, "messages": True, "billing": True},
        "app_name": "Heal Your Heart PHR",
    }, headers=staff_headers)
    assert resp3.status_code == 200

    # 4. Fetch all settings
    get_resp = client.get("/api/settings/phr", headers=staff_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert "modules" in data
    assert "shared_clinical_sections" in data
    assert "facilities" in data
    assert len(data["facilities"]) >= 6

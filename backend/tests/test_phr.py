import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.phr_service import ensure_phr_seed_data

client = TestClient(app)


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

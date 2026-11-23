import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.db import SessionLocal
from app import models as m
from app.security import digest
from app.scheduling import (
    ensure_eecp_scheduling_seed_data,
    INACTIVE_THERAPISTS_DATA,
    ACTIVE_THERAPISTS_DATA,
)

KOLKATA = ZoneInfo("Asia/Kolkata")
client = TestClient(app)


def get_staff_auth():
    db = SessionLocal()
    try:
        ensure_eecp_scheduling_seed_data(db)
        doctor = db.scalar(select(m.User).where(m.User.role == "doctor"))
        facility = db.scalar(select(m.Facility).where(m.Facility.code == "HYN"))
        if not facility:
            facility = db.scalar(select(m.Facility))

        raw_token = "staff-eecp-token-" + str(uuid4())
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


def test_seed_eecp_facilities_and_therapists():
    db = SessionLocal()
    try:
        ensure_eecp_scheduling_seed_data(db)

        # 6 Facilities
        facilities = list(db.scalars(select(m.Facility)))
        assert len(facilities) >= 6

        # Inactive therapists exist in DB with active=False
        for it in INACTIVE_THERAPISTS_DATA:
            user = db.scalar(select(m.User).where(m.User.email == it["email"]))
            assert user is not None
            assert user.active is False

        # Active therapists exist with active=True and availability
        for at in ACTIVE_THERAPISTS_DATA:
            user = db.scalar(select(m.User).where(m.User.email == at["email"]))
            assert user is not None
            assert user.active is True
    finally:
        db.close()


def test_available_therapists_endpoint_filters_inactive():
    headers = get_staff_auth()
    facility_id = headers["X-Facility-ID"]

    # Query available therapists for tomorrow at 10:00 AM
    tomorrow_str = (datetime.now(KOLKATA) + timedelta(days=1)).strftime("%Y-%m-%d")
    res = client.get(
        "/api/appointments/available-therapists",
        params={
            "facility": facility_id,
            "date": tomorrow_str,
            "start_time": "10:00 AM",
            "duration": 60,
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()

    assert "therapists" in data
    assert "busy_therapists" in data
    assert "rooms" in data
    assert data["available_count"] >= 20

    # Inactive therapists MUST NOT be in available therapists list
    inactive_names = {it["name"] for it in INACTIVE_THERAPISTS_DATA}
    returned_names = {t["name"] for t in data["therapists"]}
    assert not (returned_names & inactive_names)

    # 13 EECP rooms + Consultation room should be in rooms
    room_names = {r["name"] for r in data["rooms"]}
    assert "EECP Room 01" in room_names
    assert "EECP Room 13" in room_names
    assert "Consultation room" in room_names


def test_real_time_therapist_and_room_overlap_detection():
    headers = get_staff_auth()
    facility_id = headers["X-Facility-ID"]
    db = SessionLocal()
    try:
        # Find an active therapist and an EECP room
        therapist = db.scalar(select(m.User).where(m.User.role == "therapist", m.User.active == True))
        room = db.scalar(select(m.Resource).where(m.Resource.facility_id == facility_id, m.Resource.name == "EECP Room 01"))
        patient = db.scalar(select(m.Patient))
        if not patient:
            patient = m.Patient(id=str(uuid4()), mrn="HYH009999", first_name="Test", last_name="Patient")
            db.add(patient)
            db.commit()

        test_date = (datetime.now(KOLKATA) + timedelta(days=2)).strftime("%Y-%m-%d")
        dt_start = datetime.strptime(f"{test_date} 15:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=KOLKATA)
        dt_end = dt_start + timedelta(minutes=60)

        # Create appointment from 3:00 PM to 4:00 PM
        appt = m.Appointment(
            id=str(uuid4()),
            patient_id=patient.id,
            facility_id=facility_id,
            author_id=therapist.id,
            provider_id=therapist.id,
            resource_id=room.id if room else None,
            start_at=dt_start.astimezone(timezone.utc).replace(tzinfo=None),
            end_at=dt_end.astimezone(timezone.utc).replace(tzinfo=None),
            status="confirmed",
            visit_type="EECP session",
            reason="EECP 1st Day",
        )
        db.add(appt)
        db.commit()

        # Query exactly during that window (3:00 PM – 4:00 PM)
        res_conflict = client.get(
            "/api/appointments/available-therapists",
            params={
                "facility": facility_id,
                "date": test_date,
                "start_time": "03:00 PM",
                "duration": 60,
            },
            headers=headers,
        )
        assert res_conflict.status_code == 200
        conflict_data = res_conflict.json()

        # Therapist should NOT be in available therapists; must be in busy_therapists
        avail_ids = [t["id"] for t in conflict_data["therapists"]]
        assert therapist.id not in avail_ids
        busy_ids = [t["id"] for t in conflict_data["busy_therapists"]]
        assert therapist.id in busy_ids

        # Room should be marked unavailable
        if room:
            room_info = next((r for r in conflict_data["rooms"] if r["id"] == room.id), None)
            assert room_info is not None
            assert room_info["available"] is False
            assert "3:00 PM" in room_info["occupied_time"]

        # Clean up
        db.delete(appt)
        db.commit()
    finally:
        db.close()

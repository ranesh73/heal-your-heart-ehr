"""Idempotent cleanup of synthetic test records created during automated browser test runs."""
import os
import sys
from datetime import datetime
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal
from app.models import Appointment
from sqlalchemy import update


def clean():
    with SessionLocal() as db:
        db.execute(
            update(Appointment)
            .where(Appointment.start_at >= datetime(2033, 1, 1))
            .values(status="cancelled", reason="Test setup clean")
        )
        from app.models import Patient
        from sqlalchemy import select
        from zoneinfo import ZoneInfo
        from datetime import timezone, timedelta
        aarav = db.scalar(select(Patient).where(Patient.first_name == "Aarav"))
        if aarav:
            today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
            start = datetime.combine(today, datetime.min.time(), tzinfo=ZoneInfo("Asia/Kolkata")).replace(hour=9).astimezone(timezone.utc).replace(tzinfo=None)
            appt = db.scalar(select(Appointment).where(Appointment.patient_id == aarav.id))
            if appt:
                appt.start_at = start
                appt.end_at = start + timedelta(minutes=30)
                appt.status = "checked-in"
        db.commit()


if __name__ == "__main__":
    clean()
    print("Synthetic test appointments cleaned.")

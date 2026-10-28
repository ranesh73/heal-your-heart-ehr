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
        db.commit()


if __name__ == "__main__":
    clean()
    print("Synthetic test appointments cleaned.")

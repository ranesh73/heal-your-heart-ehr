"""
Seed billing catalogs (Procedure codes from CPT_Codes.csv, Fee Schedules, Packages,
Payment Methods, Tax Rates, Discount Types, and Lab Mappings) across all facilities.
"""

import sys
import os
from pathlib import Path

# Setup backend paths
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal, lock_writes
from app import models as m
from app.billing_service import ensure_all_facilities_billing_defaults
from sqlalchemy import select, func


def seed_billing_catalogs():
    with SessionLocal() as db:
        lock_writes(db)
        facilities = db.scalars(select(m.Facility)).all()
        print(f"Found {len(facilities)} facilities.")
        ensure_all_facilities_billing_defaults(db)

        # Summarize results
        for f in facilities:
                procs = db.scalar(
                    select(func.count(m.Catalog.id)).where(
                        m.Catalog.facility_id == f.id,
                        m.Catalog.kind == "procedure_code",
                    )
                )
                packages = db.scalar(
                    select(func.count(m.Catalog.id)).where(
                        m.Catalog.facility_id == f.id,
                        m.Catalog.kind == "billing_package",
                    )
                )
                print(f"  Facility '{f.name}' ({f.code}): {procs} procedure codes, {packages} billing packages.")

    print("\nBilling catalogs seeding complete across all facilities!")


if __name__ == "__main__":
    seed_billing_catalogs()

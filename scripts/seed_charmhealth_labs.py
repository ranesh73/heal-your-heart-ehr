import sys
import os
import json
from pathlib import Path

# Set up paths
backend_dir = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend_dir))
os.environ["PYTHONPATH"] = str(backend_dir)
if "EHR_DATA_DIR" not in os.environ:
    os.environ["EHR_DATA_DIR"] = str(backend_dir / "data")

from app.db import SessionLocal, lock_writes
from app import models as m

data_path = Path(__file__).resolve().parents[1] / "data" / "charmhealth_all_lab_tests.json"

def seed_lab_tests():
    if not data_path.exists():
        print(f"Data file not found at {data_path}")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    with SessionLocal() as db:
        lock_writes(db)
        facilities = db.query(m.Facility).all()
        print(f"Seeding lab tests for {len(facilities)} facilities...")

        count = 0
        for f in facilities:
            for group in catalog:
                group_name = group.get("lab_name", "General")
                for test in group.get("tests", []):
                    test_name = test.get("test_name")
                    code = f"LAB_{test.get('lab_record_id', test_name.replace(' ', '_').upper())}"
                    
                    content_json = json.dumps({
                        "group": group_name,
                        "lab_id": group.get("lab_id"),
                        "medical_record_id": test.get("medical_record_id"),
                        "is_group": test.get("is_group", False),
                        "parameters": test.get("parameters", [])
                    })

                    existing = db.query(m.Catalog).filter_by(
                        facility_id=f.id,
                        kind="lab_test",
                        code=code
                    ).first()

                    if existing:
                        existing.name = f"{group_name} · {test_name}"
                        existing.content = content_json
                        existing.active = True
                    else:
                        db.add(m.Catalog(
                            facility_id=f.id,
                            kind="lab_test",
                            code=code,
                            name=f"{group_name} · {test_name}",
                            price_paise=0,
                            content=content_json,
                            active=True
                        ))
                    count += 1
        db.commit()
        print(f"Successfully processed {count} lab catalog entries into database.")

if __name__ == "__main__":
    seed_lab_tests()

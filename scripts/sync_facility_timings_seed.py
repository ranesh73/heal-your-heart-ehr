import sqlite3
import json
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dbs = [root / "backend" / "data" / "ehr.db", root / "backend" / "seed_data" / "ehr_master.db"]
settings_files = [root / "backend" / "data" / "settings_store.json", root / "backend" / "seed_data" / "settings_store.json"]

DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
DEFAULT_TZ = "( GMT 5:30 ) India Standard Time ( Asia/Kolkata )"

FACILITIES = [
    ("0c0a4ad0-1c82-4a6a-b438-4df2f1a15e53", "HYN", "Heal Your Heart · Neelankarai"),
    ("c1289ee6-838d-47a4-a557-17a927567429", "HYR", "Heal Your Heart · Royapettah"),
    ("1bb852d5-524a-4d4b-a6c3-c0c17431eb3b", "HYM", "Heal Your Heart · Manapakkam"),
    ("e728479e-1e14-44d8-bbed-25bade4bfc66", "HYT", "Heal Your Heart · Tirunelveli"),
    ("bca37a27-42bb-41bd-871f-97d24a773592", "HYD", "Heal Your Heart · Madurai")
]

for db_path in dbs:
    if not db_path.exists():
        continue
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS facility_working_hours (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        created_at DATETIME NOT NULL,
        version INTEGER NOT NULL,
        facility_id VARCHAR(36) NOT NULL,
        timezone VARCHAR(100) NOT NULL,
        day_of_week VARCHAR(20) NOT NULL,
        is_working_day BOOLEAN NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        CONSTRAINT uq_facility_day_working_hours UNIQUE (facility_id, day_of_week),
        FOREIGN KEY(facility_id) REFERENCES facilities (id)
    )
    """)
    for fid, code, name in FACILITIES:
        for day in DAYS:
            is_working = 0 if day == "Sunday" else 1
            start_t = "12:00 am"
            end_t = "11:45 pm"
            # check if exists
            cur.execute("SELECT id FROM facility_working_hours WHERE facility_id=? AND day_of_week=?", (fid, day))
            existing = cur.fetchone()
            if not existing:
                cur.execute("""
                INSERT INTO facility_working_hours (id, created_at, version, facility_id, timezone, day_of_week, is_working_day, start_time, end_time)
                VALUES (?, datetime('now'), 1, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), fid, DEFAULT_TZ, day, is_working, start_t, end_t))
    con.commit()
    con.close()
    print(f"Synced facility_working_hours in {db_path}")

for sf in settings_files:
    if not sf.exists():
        continue
    try:
        with open(sf, "r", encoding="utf-8") as f:
            data = json.load(f)
    except:
        data = {}
    fac_timings = data.setdefault("facility_timings", {})
    for fid, code, name in FACILITIES:
        if fid not in fac_timings:
            fac_timings[fid] = {
                "facility_id": fid,
                "timezone": DEFAULT_TZ,
                "hours": {
                    day: {
                        "is_working_day": day != "Sunday",
                        "start_time": "12:00 am",
                        "end_time": "11:45 pm"
                    } for day in DAYS
                }
            }
    with open(sf, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Synced facility_timings in {sf}")

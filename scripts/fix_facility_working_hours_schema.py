import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dbs = [root / "backend" / "data" / "ehr.db", root / "backend" / "seed_data" / "ehr_master.db"]

for db_path in dbs:
    if not db_path.exists():
        continue
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    
    # Read existing rows
    rows = cur.execute("SELECT * FROM facility_working_hours").fetchall()
    print(f"Fixing {db_path.name}, found {len(rows)} rows")
    
    # Analyze if rows have shifted data:
    # If col 1 has 'GMT' or 'UTC' or 'Asia' instead of a date:
    fixed_rows = []
    for r in rows:
        # Check if r[1] is a timezone string
        if isinstance(r[1], str) and ("GMT" in r[1] or "Asia" in r[1] or "UTC" in r[1] or "Time" in r[1]):
            # Shifted order: (facility_id, timezone, day_of_week, is_working_day, start_time, end_time, id, created_at, version)
            fac_id, tz, day, is_work, start_t, end_t, row_id, created_at, version = r
            fixed_rows.append((row_id, str(created_at), int(version), fac_id, tz, day, int(is_work), start_t, end_t))
        else:
            # Correct order: (id, created_at, version, facility_id, timezone, day_of_week, is_working_day, start_time, end_time)
            fixed_rows.append(r)
            
    cur.execute("DROP TABLE IF EXISTS facility_working_hours")
    cur.execute("""
    CREATE TABLE facility_working_hours (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        created_at DATETIME NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        facility_id VARCHAR(36) NOT NULL,
        timezone VARCHAR(100) NOT NULL DEFAULT '( GMT 5:30 ) India Standard Time ( Asia/Kolkata )',
        day_of_week VARCHAR(20) NOT NULL,
        is_working_day BOOLEAN NOT NULL DEFAULT 1,
        start_time VARCHAR(20) NOT NULL DEFAULT '12:00 am',
        end_time VARCHAR(20) NOT NULL DEFAULT '11:45 pm',
        CONSTRAINT uq_facility_day_working_hours UNIQUE (facility_id, day_of_week),
        FOREIGN KEY(facility_id) REFERENCES facilities (id)
    )
    """)
    
    for fr in fixed_rows:
        cur.execute("""
        INSERT INTO facility_working_hours (id, created_at, version, facility_id, timezone, day_of_week, is_working_day, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, fr)
        
    con.commit()
    con.close()
    print(f"Successfully repaired facility_working_hours in {db_path.name}")


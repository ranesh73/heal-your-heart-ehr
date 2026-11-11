import sqlite3
import uuid
from datetime import datetime, timezone

con = sqlite3.connect('backend/data/ehr.db')
cur = con.cursor()

row = cur.execute("SELECT id FROM patients WHERE first_name = 'Isaac' AND last_name = 'G. E.'").fetchone()
if not row:
    pid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    fac = cur.execute("SELECT id FROM facilities LIMIT 1").fetchone()
    fac_id = fac[0] if fac else '0c0a4ad0-1c82-4a6a-b438-4df2f1a15e53'
    doc = cur.execute("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").fetchone()
    doc_id = doc[0] if doc else 'fc03d744-0035-4831-b46d-1cc84321489c'

    cur.execute("""
        INSERT INTO patients (
            id, version, mrn, first_name, last_name, dob, sex, 
            primary_facility_id, provider_id, phone, email, 
            city, state, communication_opt_in, active, created_at
        ) VALUES (
            ?, 1, 'HYN-MR-000207', 'Isaac', 'G. E.', '1974-05-18', 'Male',
            ?, ?, '+91 98765 43210', 'isaac.ge@demo.local',
            'Chennai', 'Tamil Nadu', 1, 1, ?
        )
    """, (pid, fac_id, doc_id, now))
    
    # Also link patient to patient_facilities
    cur.execute("""
        INSERT INTO patient_facilities (patient_id, facility_id)
        VALUES (?, ?)
    """, (pid, fac_id))

    print(f"Created patient Isaac G. E.: {pid}")
    con.commit()
else:
    print(f"Isaac G. E. already exists: {row[0]}")

con.close()

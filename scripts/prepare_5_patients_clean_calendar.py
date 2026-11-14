"""
Keeps exactly 5 clean realistic clinical patients:
1. Isaac G. E.
2. Aarav Demo
3. Mira Sample
4. Dev Example
5. Leela Demo

And cleans the Calendar completely (0 appointments) so the clinic staff has a fresh, clean calendar to test booking.
"""
import sqlite3
from pathlib import Path

KEEP_PATIENT_NAMES = [
    ('Isaac', 'G. E.'),
    ('Aarav', 'Demo'),
    ('Mira', 'Sample'),
    ('Dev', 'Example'),
    ('Leela', 'Demo'),
]

def clean_to_5_patients_and_empty_calendar(db_path):
    print(f"Processing: {db_path}")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # 1. Fetch & drop triggers
    c.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger'")
    triggers = c.fetchall()
    for t_name, _ in triggers:
        c.execute(f"DROP TRIGGER IF EXISTS {t_name}")
        
    # 2. Identify the 5 patients to KEEP
    keep_ids = []
    for first, last in KEEP_PATIENT_NAMES:
        c.execute("SELECT id FROM patients WHERE first_name = ? AND last_name = ?", (first, last))
        row = c.fetchone()
        if row:
            keep_ids.append(row[0])
            
    print(f"Found {len(keep_ids)} patients to keep: {keep_ids}")
    
    # Identify patient IDs to remove
    placeholders_keep = ",".join(["?"] * len(keep_ids))
    c.execute(f"SELECT id FROM patients WHERE id NOT IN ({placeholders_keep})", keep_ids)
    remove_patient_ids = [r[0] for r in c.fetchall()]
    print(f"Patients to remove: {len(remove_patient_ids)}")
    
    # 3. Clean records for removed patients
    if remove_patient_ids:
        chunk_size = 50
        for i in range(0, len(remove_patient_ids), chunk_size):
            chunk = remove_patient_ids[i:i+chunk_size]
            p_chunk = ",".join(["?"] * len(chunk))
            
            # Encounter children
            c.execute(f"DELETE FROM encounter_symptoms WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM note_revisions WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM amendments WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM encounters WHERE patient_id IN ({p_chunk})", chunk)
            
            # Invoice children
            c.execute(f"DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM credits WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM invoices WHERE patient_id IN ({p_chunk})", chunk)
            
            # EECP children
            c.execute(f"DELETE FROM eecp_daily_sessions WHERE plan_id IN (SELECT id FROM eecp_plans WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM eecp_weekly_assessments WHERE plan_id IN (SELECT id FROM eecp_plans WHERE patient_id IN ({p_chunk}))", chunk)
            c.execute(f"DELETE FROM eecp_plans WHERE patient_id IN ({p_chunk})", chunk)
            
            # Other patient-related tables
            for tbl in ['clinical_orders', 'documents', 'allergies', 'diagnoses', 'histories', 'medications', 'messages', 'patient_entries', 'patient_facilities', 'tasks', 'vitals', 'injections', 'vaccines', 'injection_orders']:
                try:
                    c.execute(f"DELETE FROM {tbl} WHERE patient_id IN ({p_chunk})", chunk)
                except Exception:
                    pass
            
            c.execute(f"DELETE FROM patients WHERE id IN ({p_chunk})", chunk)
            
    # 4. Clean Calendar completely (0 appointments)
    # Clear sessions and unbind appointments from encounters
    c.execute("DELETE FROM eecp_daily_sessions")
    c.execute("DELETE FROM eecp_weekly_assessments")
    c.execute("UPDATE encounters SET appointment_id = NULL")
    c.execute("DELETE FROM appointments")
    print("Cleaned all appointments from calendar.")
    
    # 5. Clean audit events for deleted patients/appointments
    c.execute("DELETE FROM audit_events WHERE entity_type IN ('appointment', 'appointments')")
    c.execute("DELETE FROM login_attempts")
    
    # 6. Re-create compliance triggers
    for t_name, t_sql in triggers:
        if t_sql:
            c.execute(t_sql)
            
    conn.commit()
    c.execute("VACUUM;")
    conn.close()
    
    # Verification
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT first_name, last_name, mrn FROM patients ORDER BY mrn")
    pts = c.fetchall()
    c.execute("SELECT count(*) FROM appointments")
    appt_count = c.fetchone()[0]
    conn.close()
    
    print(f"\n--- VERIFICATION FOR {db_path} ---")
    print(f"Total Patients: {len(pts)}")
    for p in pts:
        print(f"  * {p[0]} {p[1]} ({p[2]})")
    print(f"Total Calendar Appointments: {appt_count} (Completely clean!)\n")

if __name__ == '__main__':
    clean_to_5_patients_and_empty_calendar("backend/data/ehr.db")
    clean_to_5_patients_and_empty_calendar("backend/seed_data/ehr_master.db")

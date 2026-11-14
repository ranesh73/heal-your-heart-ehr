"""
Cleans out automated test patients (UITest) and test appointments,
retaining the 10 realistic clinical demo patients (Isaac G. E., Aarav Demo, Mira Sample, etc.)
along with all clinical templates, catalogs, facilities, working hours, and demo user accounts.
"""
import sqlite3
from pathlib import Path

def clean_database(db_path):
    print(f"Cleaning database: {db_path}")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # 1. Fetch and drop compliance triggers temporarily
    c.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger'")
    triggers = c.fetchall()
    print(f"Temporarily dropping {len(triggers)} triggers...")
    for t_name, _ in triggers:
        c.execute(f"DROP TRIGGER IF EXISTS {t_name}")
    
    # 2. Identify test patient IDs
    c.execute("""
        SELECT id FROM patients 
        WHERE last_name = 'UITest' 
           OR first_name LIKE '%Test%' 
           OR last_name LIKE '%Test%'
           OR mrn LIKE '%TEST%'
    """)
    test_patient_ids = [row[0] for row in c.fetchall()]
    print(f"Found {len(test_patient_ids)} test patients to remove.")
    
    if test_patient_ids:
        # Find all tables with patient_id column
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in c.fetchall()]
        
        patient_tables = []
        for t in tables:
            try:
                c.execute(f"PRAGMA table_info({t})")
                cols = [col[1] for col in c.fetchall()]
                if 'patient_id' in cols and t != 'patients':
                    patient_tables.append(t)
            except Exception:
                pass
        
        chunk_size = 50
        for i in range(0, len(test_patient_ids), chunk_size):
            chunk = test_patient_ids[i:i+chunk_size]
            placeholders = ",".join(["?"] * len(chunk))
            
            # Child relations of encounters
            c.execute(f"""
                DELETE FROM encounter_symptoms WHERE encounter_id IN (
                    SELECT id FROM encounters WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            c.execute(f"""
                DELETE FROM note_revisions WHERE encounter_id IN (
                    SELECT id FROM encounters WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            c.execute(f"""
                DELETE FROM amendments WHERE encounter_id IN (
                    SELECT id FROM encounters WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            
            # Child relations of invoices
            c.execute(f"""
                DELETE FROM invoice_lines WHERE invoice_id IN (
                    SELECT id FROM invoices WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            c.execute(f"""
                DELETE FROM payments WHERE invoice_id IN (
                    SELECT id FROM invoices WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            
            # Child relations of eecp_plans
            c.execute(f"""
                DELETE FROM eecp_daily_sessions WHERE plan_id IN (
                    SELECT id FROM eecp_plans WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            c.execute(f"""
                DELETE FROM eecp_weekly_assessments WHERE plan_id IN (
                    SELECT id FROM eecp_plans WHERE patient_id IN ({placeholders})
                )
            """, chunk)
            
            # Delete from all tables having patient_id
            for pt_table in patient_tables:
                c.execute(f"DELETE FROM {pt_table} WHERE patient_id IN ({placeholders})", chunk)
            
            # Delete from patients
            c.execute(f"DELETE FROM patients WHERE id IN ({placeholders})", chunk)
            
    # 3. Clean up any weird future 2030+ test appointments
    c.execute("DELETE FROM appointments WHERE start_at >= '2030-01-01'")
    
    # 4. Clean up audit events relating to test patients
    try:
        c.execute("DELETE FROM audit_events WHERE entity_type='patient' AND entity_id NOT IN (SELECT id FROM patients)")
    except Exception:
        pass
        
    # 5. Clean up login attempts
    try:
        c.execute("DELETE FROM login_attempts")
    except Exception:
        pass
        
    # 6. Re-create all triggers
    print(f"Re-creating {len(triggers)} triggers...")
    for t_name, t_sql in triggers:
        if t_sql:
            c.execute(t_sql)
            
    conn.commit()
    c.execute("VACUUM;")
    conn.close()
    
    # 7. Verification summary
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT count(*) FROM patients")
    pt_count = c.fetchone()[0]
    c.execute("SELECT count(*) FROM appointments")
    appt_count = c.fetchone()[0]
    c.execute("SELECT count(*) FROM facilities")
    fac_count = c.fetchone()[0]
    c.execute("SELECT count(*) FROM users")
    user_count = c.fetchone()[0]
    
    c.execute("SELECT first_name, last_name, mrn FROM patients ORDER BY mrn")
    pts = c.fetchall()
    conn.close()
    
    print(f"\n--- SUCCESS FOR {db_path} ---")
    print(f"Patients: {pt_count}")
    for p in pts:
        print(f"  * {p[0]} {p[1]} ({p[2]})")
    print(f"Appointments: {appt_count}")
    print(f"Facilities: {fac_count}")
    print(f"Users: {user_count}\n")

if __name__ == '__main__':
    backend_data_db = Path("backend/data/ehr.db")
    seed_master_db = Path("backend/seed_data/ehr_master.db")
    
    clean_database(backend_data_db)
    clean_database(seed_master_db)
    
    # Remove temp_clean if exists
    temp_dir = Path("temp_clean")
    if temp_dir.exists():
        import shutil
        shutil.rmtree(temp_dir)

import sqlite3

for p in ['backend/data/ehr.db', 'backend/seed_data/ehr_master.db']:
    conn = sqlite3.connect(p)
    c = conn.cursor()
    c.execute("""
        UPDATE templates 
        SET template_type = 'SOAP'
        WHERE is_practice = 1 AND (name LIKE 'Diet for%_Practice' OR name LIKE 'Heart Failure Patient Diet%')
    """)
    conn.commit()
    conn.close()
    print('Updated diet practice templates to SOAP in', p)

import sqlite3
import zipfile
import tempfile
import os

zip_path = r'C:/Users/sanju/.gemini/antigravity/brain/eea05a21-385e-4cde-9f6f-671c12299915/.user_uploaded/media_1794557841256_4f51a35f.zip'

with zipfile.ZipFile(zip_path) as z:
    tmp_db = tempfile.mktemp(suffix='.db')
    with open(tmp_db, 'wb') as f:
        f.write(z.read('ehr_templates.db'))

source_con = sqlite3.connect(tmp_db)
source_cur = source_con.cursor()

# Target databases
targets = ['backend/data/ehr.db', 'backend/seed_data/ehr_master.db']

template_tables = [
    'templates',
    'template_sections',
    'template_components',
    'template_options',
    'template_relationships',
    'template_permissions',
    'template_consultation_responses',
    'template_responses',
    'medication_references'
]

for target_path in targets:
    if not os.path.exists(target_path):
        continue
    print(f"\nUpdating {target_path}...")
    target_con = sqlite3.connect(target_path)
    target_cur = target_con.cursor()
    
    for tbl in template_tables:
        source_table = 'consultations' if tbl == 'template_consultation_responses' else tbl
        # Get schema from source
        ddl = source_cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{source_table}'").fetchone()
        if not ddl or not ddl[0]:
            print(f"  Warning: No DDL for {tbl}")
            continue
        
        # Drop old table in target if exists
        target_cur.execute(f"DROP TABLE IF EXISTS [{tbl}]")
        # Create fresh table with exact schema
        target_cur.execute(ddl[0].replace(f'CREATE TABLE {source_table}', f'CREATE TABLE {tbl}'))
        
        # Copy data
        rows = source_cur.execute(f"SELECT * FROM [{source_table}]").fetchall()
        if rows:
            placeholders = ','.join(['?' for _ in rows[0]])
            target_cur.executemany(f"INSERT INTO [{tbl}] VALUES ({placeholders})", rows)
        print(f"  Copied {tbl}: {len(rows)} rows")
    
    target_con.commit()
    target_con.close()

source_con.close()
os.remove(tmp_db)
print("\nMerge completed successfully!")

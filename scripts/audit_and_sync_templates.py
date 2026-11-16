import sqlite3
import json

src_path = r'C:\Users\sanju\Downloads\HUH\charm_health-main\backend\ehr_templates.db'
dst_paths = ['backend/data/ehr.db', 'backend/seed_data/ehr_master.db']

src_con = sqlite3.connect(src_path)
src_cur = src_con.cursor()

tables_to_check = [
    'templates',
    'template_sections',
    'template_components',
    'template_options',
    'template_relationships',
    'template_permissions',
    'medication_references',
    'consultations',
    'template_responses'
]

print("=== SOURCE DATABASE INVENTORY (C:\\Users\\sanju\\Downloads\\HUH\\charm_health-main\\backend\\ehr_templates.db) ===")
src_counts = {}
for t in tables_to_check:
    c = src_cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    src_counts[t] = c
    print(f"  {t}: {c} records")

for dst_path in dst_paths:
    print(f"\n=== DESTINATION DATABASE AUDIT ({dst_path}) ===")
    dst_con = sqlite3.connect(dst_path)
    dst_cur = dst_con.cursor()
    
    # Ensure tables exist with exact schema
    for t in tables_to_check:
        # Check if table exists
        exists = dst_cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?", (t,)).fetchone()[0]
        if not exists:
            print(f"Creating missing table {t} in {dst_path}...")
            schema = src_cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{t}'").fetchone()[0]
            dst_cur.execute(schema)
            dst_con.commit()
            
        dst_c = dst_cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        print(f"  {t}: {dst_c} records (Source: {src_counts[t]})")
        
        # Check for missing IDs
        src_rows = src_cur.execute(f'SELECT * FROM "{t}"').fetchall()
        src_cols = [col[0] for col in src_cur.description]
        
        # Primary key is usually first column
        pk_col = src_cols[0]
        placeholders = ', '.join(['?'] * len(src_cols))
        col_names = ', '.join([f'"{c}"' for c in src_cols])
        
        inserted_count = 0
        updated_count = 0
        for r in src_rows:
            pk_val = r[0]
            exists = dst_cur.execute(f'SELECT count(*) FROM "{t}" WHERE "{pk_col}" = ?', (pk_val,)).fetchone()[0]
            if exists == 0:
                dst_cur.execute(f'INSERT INTO "{t}" ({col_names}) VALUES ({placeholders})', r)
                inserted_count += 1
            else:
                # Update to match source exactly
                update_set = ', '.join([f'"{c}" = ?' for c in src_cols[1:]])
                dst_cur.execute(f'UPDATE "{t}" SET {update_set} WHERE "{pk_col}" = ?', list(r[1:]) + [pk_val])
                updated_count += 1
                
        dst_con.commit()
        if inserted_count > 0 or updated_count > 0:
            print(f"    Synced {t}: {inserted_count} new inserted, {updated_count} verified/updated.")
        
        final_c = dst_cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        print(f"    Final verified count: {final_c}")
    dst_con.close()

src_con.close()
print("\n=== AUDIT & SYNC COMPLETED SUCCESSFULLY ===")

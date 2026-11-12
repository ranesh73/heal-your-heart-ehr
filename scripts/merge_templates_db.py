import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
src_db = Path(r"C:\Users\sanju\Downloads\HUH\charm_health-main\backend\ehr_templates.db")
dest_dbs = [root / "backend" / "data" / "ehr.db", root / "backend" / "seed_data" / "ehr_master.db"]

if not src_db.exists():
    print(f"Error: {src_db} not found")
    exit(1)

tables_to_merge = [
    'templates',
    'template_sections',
    'template_components',
    'template_options',
    'template_relationships',
    'template_permissions',
    'template_responses',
    'medication_references'
]

src_conn = sqlite3.connect(src_db)
src_conn.row_factory = sqlite3.Row
src_cur = src_conn.cursor()

for dest_path in dest_dbs:
    if not dest_path.exists():
        continue
    dest_conn = sqlite3.connect(dest_path)
    dest_cur = dest_conn.cursor()

    for table in tables_to_merge:
        # Get create table DDL from src
        src_cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
        res = src_cur.fetchone()
        if not res:
            continue
        ddl = res[0]
        # Create table if not exists in dest
        dest_cur.execute(ddl)

        # Check existing count
        dest_cur.execute(f"SELECT count(*) FROM {table}")
        existing_count = dest_cur.fetchone()[0]

        if existing_count == 0:
            # Copy all rows
            src_cur.execute(f"SELECT * FROM {table}")
            rows = src_cur.fetchall()
            if rows:
                col_names = [description[0] for description in src_cur.description]
                placeholders = ', '.join(['?'] * len(col_names))
                cols_str = ', '.join(col_names)
                dest_cur.executemany(
                    f"INSERT OR REPLACE INTO {table} ({cols_str}) VALUES ({placeholders})",
                    [tuple(r) for r in rows]
                )
                print(f"Copied {len(rows)} rows into {table} in {dest_path.name}")
        else:
            print(f"Table {table} in {dest_path.name} already has {existing_count} rows, skipping insert.")

    dest_conn.commit()
    dest_conn.close()

src_conn.close()
print("Merge complete!")

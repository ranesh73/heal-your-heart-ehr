import sys
sys.path.insert(0, '.')
import sqlite3
from backend.app.models import Base
from sqlalchemy import create_engine

def sync_schema(db_path):
    print(f"\nSyncing schema for {db_path}...")
    
    # 1. Create missing tables using SQLAlchemy
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(engine)
    engine.dispose()
    
    # 2. Add missing columns using SQLite ALTER TABLE
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    added_count = 0
    for table_name, table in Base.metadata.tables.items():
        cursor.execute(f"PRAGMA table_info('{table_name}');")
        existing_cols = {r[1] for r in cursor.fetchall()}
        
        for col in table.columns:
            if col.name not in existing_cols:
                # determine sql type
                col_type = "VARCHAR(255)"
                t_str = str(col.type).upper()
                if "INT" in t_str:
                    col_type = "INTEGER"
                elif "FLOAT" in t_str or "NUMERIC" in t_str:
                    col_type = "FLOAT"
                elif "BOOL" in t_str:
                    col_type = "BOOLEAN DEFAULT 1"
                elif "DATETIME" in t_str or "TIMESTAMP" in t_str:
                    col_type = "DATETIME"
                elif "TEXT" in t_str:
                    col_type = "TEXT"
                else:
                    col_type = str(col.type)
                
                alter_sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type};'
                try:
                    cursor.execute(alter_sql)
                    print(f"  Added column: {table_name}.{col.name} ({col_type})")
                    added_count += 1
                except Exception as e:
                    print(f"  Failed to add {table_name}.{col.name}: {e}")
                    
    conn.commit()
    conn.close()
    print(f"Sync complete for {db_path}: {added_count} columns added.")

sync_schema('backend/data/ehr.db')
sync_schema('backend/seed_data/ehr_master.db')

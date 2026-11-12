"""
Synchronize local development database and settings with the exact master dataset from the primary workspace.
Replaces local ehr.db with backend/seed_data/ehr_master.db.
"""

import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
src_db = root / "backend" / "seed_data" / "ehr_master.db"
src_settings = root / "backend" / "seed_data" / "settings_store.json"

dest_dir = root / "backend" / "data"
dest_dir.mkdir(parents=True, exist_ok=True)
dest_db = dest_dir / "ehr.db"
dest_settings = dest_dir / "settings_store.json"

if not src_db.exists():
    print(f"Error: master snapshot not found at {src_db}")
    exit(1)

shutil.copy2(src_db, dest_db)
print(f"✓ Copied master database to {dest_db} ({src_db.stat().st_size // 1024} KB)")

# Remove any old WAL or SHM files so the new ehr.db is read fresh
wal_file = dest_dir / "ehr.db-wal"
shm_file = dest_dir / "ehr.db-shm"
if wal_file.exists():
    try: wal_file.unlink()
    except Exception: pass
if shm_file.exists():
    try: shm_file.unlink()
    except Exception: pass

if src_settings.exists():
    shutil.copy2(src_settings, dest_settings)
    print(f"✓ Copied master CharmHealth settings to {dest_settings}")

print("\n>>> SYNC COMPLETE! Your local database now exactly matches the primary developer laptop! <<<")


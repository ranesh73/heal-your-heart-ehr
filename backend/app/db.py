import os
from pathlib import Path
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from fastapi import Request

DATA_DIR = Path(os.getenv('EHR_DATA_DIR', Path(__file__).resolve().parents[1] / 'data')).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Auto-provision master demonstration database if local database is missing
DB_FILE = DATA_DIR / "ehr.db"
SNAPSHOT = Path(__file__).resolve().parents[1] / "seed_data" / "ehr_master.db"
SETTINGS_SRC = Path(__file__).resolve().parents[1] / "seed_data" / "settings_store.json"
SETTINGS_DEST = DATA_DIR / "settings_store.json"
if not DB_FILE.exists() and SNAPSHOT.exists():
    import shutil
    shutil.copy2(SNAPSHOT, DB_FILE)
if not SETTINGS_DEST.exists() and SETTINGS_SRC.exists():
    import shutil
    shutil.copy2(SETTINGS_SRC, SETTINGS_DEST)

DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DB_FILE}')
engine = create_engine(DATABASE_URL, pool_pre_ping=True,
    connect_args={'check_same_thread': False, 'timeout': 30} if DATABASE_URL.startswith('sqlite') else {})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

if engine.dialect.name == 'sqlite':
    @event.listens_for(engine, 'connect')
    def sqlite_constraints(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
        connection.execute('PRAGMA journal_mode=WAL')


def lock_writes(db):
    # Deliberately coarse locking: all app writers share the same transaction lock.
    # This preserves booking/ledger invariants across worker processes, at the cost of throughput.
    if engine.dialect.name == 'sqlite':
        db.execute(text('BEGIN IMMEDIATE'))
    else:
        db.execute(text('SELECT pg_advisory_xact_lock(719240021)'))


def get_db(request: Request):
    with SessionLocal() as db:
        try:
            if request.method not in ('GET', 'HEAD', 'OPTIONS'):
                lock_writes(db)
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise

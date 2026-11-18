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
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True,
    connect_args={'check_same_thread': False, 'timeout': 30} if DATABASE_URL.startswith('sqlite') else {})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

if engine.dialect.name == 'sqlite':
    @event.listens_for(engine, 'connect')
    def sqlite_constraints(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
        connection.execute('PRAGMA journal_mode=WAL')
        connection.execute('PRAGMA busy_timeout=30000')


def init_db():
    from . import models as m
    from datetime import datetime, date
    from sqlalchemy import DateTime, Date
    import sqlite3
    import logging

    log = logging.getLogger('ehr')
    m.Base.metadata.create_all(bind=engine)

    if engine.dialect.name != 'sqlite':
        try:
            with engine.begin() as conn:
                user_count = conn.execute(text("SELECT count(*) FROM users")).scalar()
                if user_count == 0 and SNAPSHOT.exists():
                    log.info("Seeding PostgreSQL from master database snapshot...")
                    src_conn = sqlite3.connect(SNAPSHOT)
                    src_conn.row_factory = sqlite3.Row
                    src_cur = src_conn.cursor()

                    for table in m.Base.metadata.sorted_tables:
                        src_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table.name,))
                        if not src_cur.fetchone():
                            continue
                        if table.name == "audit_events":
                            src_cur.execute(f"SELECT * FROM {table.name} ORDER BY created_at DESC LIMIT 50")
                        else:
                            src_cur.execute(f"SELECT * FROM {table.name}")
                        rows = [dict(r) for r in src_cur.fetchall()]
                        if rows:
                            col_map = {c.name: c for c in table.columns}
                            parsed_rows = []
                            for r in rows:
                                p_row = {}
                                for k, v in r.items():
                                    if k in col_map:
                                        col = col_map[k]
                                        if v is not None and isinstance(col.type, DateTime) and isinstance(v, str):
                                            try:
                                                v = datetime.fromisoformat(v)
                                            except Exception:
                                                try:
                                                    v = datetime.strptime(v, '%Y-%m-%d %H:%M:%S.%f')
                                                except Exception:
                                                    pass
                                        elif v is not None and isinstance(col.type, Date) and isinstance(v, str):
                                            try:
                                                v = date.fromisoformat(v[:10])
                                            except Exception:
                                                pass
                                        p_row[k] = v
                                parsed_rows.append(p_row)

                            if table.foreign_keys:
                                for fk in table.foreign_keys:
                                    tgt_tbl = fk.column.table.name
                                    tgt_col = fk.column.name
                                    try:
                                        existing_ids = set(conn.execute(text(f"SELECT {tgt_col} FROM {tgt_tbl}")).scalars().all())
                                        parsed_rows = [r for r in parsed_rows if r.get(fk.parent.name) is None or r.get(fk.parent.name) in existing_ids]
                                    except Exception:
                                        pass

                            if parsed_rows:
                                CHUNK_SIZE = 50
                                for i in range(0, len(parsed_rows), CHUNK_SIZE):
                                    chunk = parsed_rows[i:i + CHUNK_SIZE]
                                    conn.execute(table.insert(), chunk)
                    log.info("PostgreSQL database seeding complete!")
        except Exception as e:
            log.warning("PostgreSQL auto-seed check skipped or failed: %s", e)


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

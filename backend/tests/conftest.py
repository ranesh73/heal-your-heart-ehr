import os
import tempfile
from pathlib import Path
from uuid import uuid4

# Set up isolated test data dir for pytest sessions before any app imports
if 'EHR_DATA_DIR' not in os.environ:
    os.environ['EHR_DATA_DIR'] = tempfile.mkdtemp(prefix='ehr-tests-')

if os.getenv('EHR_TEST_DATABASE_URL'):
    if not os.environ['EHR_TEST_DATABASE_URL'].split('?', 1)[0].endswith('_test'):
        raise RuntimeError('Test database name must end in _test')
    os.environ['DATABASE_URL'] = os.environ['EHR_TEST_DATABASE_URL']
else:
    os.environ.pop('DATABASE_URL', None)

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import select
from app.db import SessionLocal, lock_writes
from app.models import User
from app.seed import seed
from app.security import password_hash

PASSWORD = 'Test-only-' + uuid4().hex

@pytest.fixture(scope='session', autouse=True)
def setup_test_suite():
    command.upgrade(Config('alembic.ini'), 'head')
    with SessionLocal() as db:
        lock_writes(db)
        if not seed(db, PASSWORD):
            for r in ['admin', 'doctor', 'assistant', 'therapist', 'reception', 'billing']:
                u = db.scalar(select(User).where(User.email == r + '@demo.local'))
                if u:
                    u.password_hash = password_hash(PASSWORD)
        db.commit()
    try:
        from scripts.seed_medicine_catalogs import seed as seed_meds
        seed_meds()
    except Exception:
        pass
    try:
        from scripts.seed_rx_catalogs import seed_rx
        seed_rx()
    except Exception:
        pass
    yield
    with SessionLocal() as db:
        lock_writes(db)
        for r in ['admin', 'doctor', 'assistant', 'therapist', 'reception', 'billing']:
            u = db.scalar(select(User).where(User.email == r + '@demo.local'))
            if u:
                u.password_hash = password_hash('password123')
        db.commit()

#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
(cd frontend && npm ci --no-audit --no-fund && npm run build)
cd backend
../.venv/bin/python -m alembic upgrade head
../.venv/bin/python -m app.seed
echo 'Open http://127.0.0.1:8000. Credentials are in .demo-credentials.txt in the project root.'
exec ../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log

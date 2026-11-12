# Development Environment Startup Script for Heal Your Heart EHR
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Heal Your Heart EHR - Dev Environment   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Run database migrations
Write-Host "`n[1/3] Running database migrations..." -ForegroundColor Yellow
if (Test-Path ".venv\Scripts\alembic.exe") {
    & ".venv\Scripts\alembic.exe" -c backend/alembic.ini upgrade head
} else {
    Write-Host "Warning: .venv alembic not found. Skipping migration." -ForegroundColor Red
}

# 2. Seed catalogs
Write-Host "[2/3] Verifying database seeds..." -ForegroundColor Yellow
if (Test-Path "scripts\seed_injection_catalogs.py") {
    & ".venv\Scripts\python.exe" scripts/seed_injection_catalogs.py
}

# 3. Summary
Write-Host "`n[3/3] System synchronized!" -ForegroundColor Green
Write-Host "Backend runs on: http://127.0.0.1:8000 (with --reload)" -ForegroundColor White
Write-Host "Frontend runs on: http://127.0.0.1:5173" -ForegroundColor White


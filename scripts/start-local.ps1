param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PythonExe = Join-Path $ProjectRoot '.venv\Scripts\python.exe'
Push-Location $ProjectRoot
try {
    if (-not (Test-Path -LiteralPath $PythonExe)) { python -m venv .venv }
    if (-not $SkipInstall) {
        & $PythonExe -m pip install -r backend\requirements.txt
        if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed' }
        Push-Location frontend
        try { npm.cmd ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'Node dependency installation failed' } } finally { Pop-Location }
    }
    Push-Location frontend
    try { npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
    Push-Location backend
    try {
        & $PythonExe -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed' }
        & $PythonExe -m app.seed
        if ($LASTEXITCODE -ne 0) { throw 'Synthetic seeding failed' }
        Write-Host 'Open http://127.0.0.1:8000. Credentials are in .demo-credentials.txt in the project root.'
        & $PythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
    } finally { Pop-Location }
} finally { Pop-Location }

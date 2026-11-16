@echo off
title Heal Your Heart EHR - Dual Dev Server Launcher
echo ======================================================================
echo   HEAL YOUR HEART EHR - CLINICAL WORKSPACE
echo ======================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [1/2] Starting FastAPI Backend on port 8000...
start "HYH EHR Backend" cmd /k "cd /d ""%SCRIPT_DIR%"" && .venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Frontend Vite Server on port 5173...
start "HYH EHR Frontend" cmd /k "cd /d ""%SCRIPT_DIR%"" && npm --prefix frontend run dev -- --host 127.0.0.1"

timeout /t 3 >nul
start "" "http://127.0.0.1:5173"

echo.
echo ======================================================================
echo   Both servers launched successfully!
echo   Application URL: http://127.0.0.1:5173
echo   Backend API:     http://127.0.0.1:8000
echo   Demo Login:      doctor@demo.local / password123
echo                    sanju2kguru@gmail.com / password123
echo ======================================================================

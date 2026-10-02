@echo off
TITLE Sanad Sovereign Voice AI - Launcher
COLOR 0A

echo ========================================================
echo   SANAD SOVEREIGN VOICE AI - RIYADH DEMO LAUNCHER
echo   Founder: Jamil Alamin Ahmedin
echo ========================================================
echo.

cd /d "%~dp0\.."

echo [1/3] Starting FastAPI Backend & Token Server (Port 8080)...
start "Sanad Backend API" cmd /k ".\.venv\Scripts\python -m uvicorn server.app:app --host 0.0.0.0 --port 8080 --reload"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Next.js Web Dashboard (Port 3000)...
cd web
start "Sanad Web Dashboard" cmd /k "npm run dev"

timeout /t 4 /nobreak >nul

echo [3/3] Opening Dashboard in Chrome / Default Browser...
start http://localhost:3000

echo.
echo ========================================================
echo   Platform is running!
echo   - Web Dashboard: http://localhost:3000
echo   - Backend API:   http://localhost:8080/docs
echo ========================================================
pause

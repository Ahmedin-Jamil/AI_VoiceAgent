@echo off
title LevelLM Voice AI - Platform Launcher
color 0A

echo ========================================================
echo    LEVELLM SAUDI VOICE AI - PLATFORM LAUNCHER
echo    Real Estate - Car Rentals - Logistics - Universal
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check Python virtual environment
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at .venv!
    echo Please create it first:
    echo   python -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: 2. Start FastAPI Backend (Port 8000)
echo [1/3] Starting FastAPI Backend on http://localhost:8000 ...
start "LevelLM Backend (Port 8000)" cmd /k "cd /d "%~dp0" && .venv\Scripts\activate.bat && python -m uvicorn server.app:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: 3. Start Next.js Frontend (Port 3000)
echo [2/3] Starting Next.js Production Server on http://localhost:3000 ...
start "LevelLM Frontend (Port 3000)" cmd /k "cd /d "%~dp0\web" && npm run start"
timeout /t 4 /nobreak >nul

:: 4. Start Ngrok Tunnel (Port 3000 -> HTTPS for mobile phone)
echo [3/3] Starting Ngrok HTTPS Tunnel for Smartphone ...
if exist "C:\ngrok\ngrok.exe" (
    start "LevelLM Ngrok Tunnel" cmd /k "C:\ngrok\ngrok.exe http 3000"
) else (
    echo [WARN] ngrok.exe not found at C:\ngrok\ngrok.exe. Trying system PATH...
    start "LevelLM Ngrok Tunnel" cmd /k "ngrok http 3000"
)

:: 5. Open Localhost in default browser
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo   ALL LEVELLM SERVICES ARE NOW RUNNING!
echo   - Local Desktop:    http://localhost:3000
echo   - Backend API Docs: http://localhost:8000/docs
echo   - Mobile Phone:     Copy the HTTPS link from the Ngrok window
echo ========================================================
echo.
echo Leave this and the other windows open while using the platform.
pause

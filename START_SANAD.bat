@echo off
title Sanad Voice AI Platform - Startup
color 0A
echo.
echo  ======================================================
echo    SANAD SOVEREIGN VOICE AI - PLATFORM LAUNCHER
echo    Saudi Arabia B2B SaaS - All Services
echo  ======================================================
echo.

:: ── Check if .venv exists ──────────────────────────────────────────────────
if not exist ".venv" (
    echo [ERROR] Python virtual environment not found!
    echo Run this first:
    echo   python -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: ── Activate venv ─────────────────────────────────────────────────────────
call .venv\Scripts\activate.bat

:: ── Start Ollama (portable install) ──────────────────────────────────────
set OLLAMA_EXE=%USERPROFILE%\ollama\ollama.exe
if exist "%OLLAMA_EXE%" (
    echo [1/4] Starting Ollama LLM server (qwen2.5:7b - Arabic)...
    set OLLAMA_MODELS=%USERPROFILE%\.ollama\models
    start "Ollama LLM Server" /min "%OLLAMA_EXE%" serve
    timeout /t 3 /nobreak >nul
) else (
    echo [WARN] Ollama not found at %OLLAMA_EXE%
    echo        Run: C:\Users\john-PC\ollama\ollama.exe serve
    echo.
)

:: ── Start FastAPI Backend ─────────────────────────────────────────────────
echo [2/4] Starting FastAPI backend (port 8000)...
echo        → Token API, TTS Streaming, Health Check, KB API
start "Sanad FastAPI Backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

:: ── Start Next.js Dashboard ───────────────────────────────────────────────
echo [3/4] Starting Next.js Dashboard (port 3000)...
echo        → Call Sandbox, Studio, Telemetry, SIP Hub
start "Sanad Web Dashboard" cmd /k "cd web && npm run dev"
timeout /t 4 /nobreak >nul

:: ── Open Browser ─────────────────────────────────────────────────────────
echo [4/4] Opening dashboard in browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo  ✅ ALL SERVICES STARTED
echo  ══════════════════════════════════════════════
echo    Web Dashboard  →  http://localhost:3000
echo    FastAPI Backend →  http://localhost:8000
echo    API Docs        →  http://localhost:8000/docs
echo    Health Check    →  http://localhost:8000/api/health
echo  ══════════════════════════════════════════════
echo.
echo  ℹ️  AUDIO SETUP (for real Saudi voice in browser):
echo     Backend must be running on port 8000 for HamedNeural TTS.
echo     If you hear no audio, check the FastAPI window for errors.
echo.
echo  ℹ️  LLM SETUP (for live AI responses):
echo     Option 1 (FREE): ollama pull qwen2.5:7b  (great Arabic)
echo     Option 2 (FREE): ollama pull allam        (Saudi Arabic)
echo     Option 3 (PAID): Set ALLAM_HF_ENDPOINT_URL in .env
echo.
echo  Close this window to leave services running.
echo  Close the individual service windows to stop them.
pause

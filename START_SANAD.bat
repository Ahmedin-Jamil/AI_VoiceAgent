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

:: ── Check if Ollama is installed ──────────────────────────────────────────
where ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/4] Starting Ollama (local LLM)...
    start "Ollama LLM Server" /min cmd /c "ollama serve"
    timeout /t 2 /nobreak >nul
) else (
    echo [WARN] Ollama not installed - LLM responses will be demo-only.
    echo        Install from: https://ollama.com/download
    echo        Then run:     ollama pull qwen2.5:7b
    echo.
)

:: ── Start FastAPI Backend ─────────────────────────────────────────────────
echo [2/4] Starting FastAPI backend (port 8080)...
echo        → Token API, TTS Streaming, Health Check, KB API
start "Sanad FastAPI Backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn server.app:app --host 0.0.0.0 --port 8080 --reload"
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
echo    FastAPI Backend →  http://localhost:8080
echo    API Docs        →  http://localhost:8080/docs
echo    Health Check    →  http://localhost:8080/api/health
echo  ══════════════════════════════════════════════
echo.
echo  ℹ️  AUDIO SETUP (for real Saudi voice in browser):
echo     Backend must be running on port 8080 for HamedNeural TTS.
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

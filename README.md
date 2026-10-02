# 🎙️ Sovereign Voice AI Call Center Platform (Saudi Arabia B2B)

**Founder:** Jamil Alamin Ahmedin (BSIT Major in ERP / Software & Data Engineer)  
**Target Market:** Riyadh & Saudi Arabia (B2B Enterprise, Healthcare Clinics, E-Commerce, Logistics)  
**Value Proposition:** 100% Data-Sovereign, On-Premise Voice AI Agent Platform — Zero per-minute API fees, compliant with Saudi PDPL regulations, and fluent in Saudi Arabic (Najdi & Hijazi dialects).

---

## 🏗️ Architecture

```
[WebRTC Browser Mic / Saudi SIP Trunk]
                   │
                   ▼
┌──────────────────────────────────────────────┐
│ LiveKit Server (Self-Hosted / Docker)        │
└──────────────────┬───────────────────────────┘
                   │ Audio Stream (PCM)
                   ▼
┌──────────────────────────────────────────────┐
│ Silero VAD (Voice Activity Detection)         │
│   • Barge-in interruption support (<50ms)    │
└──────────────────┬───────────────────────────┘
                   │ Audio Segment
                   ▼
┌──────────────────────────────────────────────┐
│ Faster-Whisper STT (Ears)                    │
│   • Sub-300ms transcription latency          │
│   • Local GPU/CPU inference (CTranslate2)    │
└──────────────────┬───────────────────────────┘
                   │ Text Prompt + Sovereign RAG
                   ▼
┌──────────────────────────────────────────────┐
│ LLM Brain (Dialogue Manager)                 │
│   • Llama 3.1 8B / ALLAM via vLLM / Ollama   │
│   • Saudi Dialect Personas (Najdi / Hijazi)  │
│   • Function Tools: Booking, Tracking, RAG   │
└──────────────────┬───────────────────────────┘
                   │ Response Text
                   ▼
┌──────────────────────────────────────────────┐
│ Saudi Neural TTS (Mouth)                     │
│   • ar-SA-HamedNeural / ar-SA-ZariyahNeural  │
│   • Zero API cost streaming audio            │
└──────────────────┬───────────────────────────┘
                   │ Audio Stream
                   ▼
       [Caller Hears Response]
```

---

## 📁 Project Structure

```
sovereign_voice_ai/
├── agent/
│   ├── agent.py          # Core LiveKit Agent worker (entrypoint, barge-in, VAD)
│   ├── prompts.py        # Saudi Najdi, Hijazi, Fusha & Bilingual system prompts
│   ├── stt_service.py    # Faster-Whisper local STT adapter (livekit.agents.stt)
│   ├── tts_service.py    # Authentic Saudi Arabic TTS adapter (livekit.agents.tts)
│   ├── llm_service.py    # Ollama / vLLM / OpenAI-compatible LLM factory
│   ├── rag_service.py    # Sovereign RAG FAQ retrieval & voice function tools
│   └── cli_test.py       # Diagnostic CLI test harness (latency, STT, TTS, RAG)
├── server/
│   └── app.py            # FastAPI token generator & telemetry server (Port 8080)
├── data/
│   └── saudi_enterprise_kb.json # Enterprise knowledge base (Clinics, Logistics, PDPL)
├── tests/
│   └── test_greeting.mp3 # Generated diagnostic audio verification file
├── config.py             # Centralized environment configuration
├── docker-compose.yml    # Self-hosted LiveKit Server & Redis container stack
├── requirements.txt      # Pinned Python dependencies
└── .env                  # Runtime settings (Dialect, STT, TTS, LLM)
```

---

## 🚀 Quickstart & Verification

### 1. Run Diagnostic Test Harness
Test TTS synthesis, Faster-Whisper transcription, and Sovereign RAG locally:
```powershell
cd C:\Users\john-PC\.gemini\antigravity\scratch\sovereign_voice_ai
.\.venv\Scripts\python agent/cli_test.py
```

### 2. Start Self-Hosted LiveKit Server
Using Docker:
```powershell
docker compose up -d
```
LiveKit Server runs locally at `ws://127.0.0.1:7880` with `--dev` keys (`devkey` / `secret`).

### 3. Start LiveKit Voice Agent Worker
```powershell
.\.venv\Scripts\python agent/agent.py dev
```

### 4. Start FastAPI Token & Telemetry Server
```powershell
.\.venv\Scripts\python -m uvicorn server.app:app --host 0.0.0.0 --port 8080 --reload
```
Exposes:
- `POST /api/token` -> Issues WebRTC JWT tokens for Next.js browser callers
- `GET /api/health` -> Telemetry and sovereign stack status
- `GET /api/dialects` -> Dialect selector (Najdi, Hijazi, Fusha, Bilingual)
- `GET /api/kb/faqs` -> Enterprise knowledge base management

---

## 🇸🇦 Saudi Dialect & Enterprise Tools Ready
- **Najdi Dialect (النهجة النجدية):** Warm Riyadh phrasing (*"يا هلا والله ومرحبا"*, *"طال عمرك"*, *"سمّ"*, *"أبشر بسعدك"*).
- **Hijazi Dialect (اللهجة الحجازية):** Western region phrasing (*"أهلاً وسهلاً"*, *"يا سيدي تحت أمرك"*, *"من عيوني"*).
- **Enterprise Tools:**
  - `book_clinic_appointment`: Real-time Riyadh medical clinic scheduling.
  - `track_saudi_shipment`: Real-time logistics package status check.
  - `search_knowledge_base`: Instant FAQ lookup without sending data outside the country.
  - `escalate_to_human_specialist`: Seamless handoff to human agents.

---

## ⏭️ Next Step: Step 2 Frontend Dashboard
Ready to build the Next.js (React) + Tailwind CSS + Lucide Icons dark mode dashboard with an interactive Vapi-style live audio waveform sandbox.

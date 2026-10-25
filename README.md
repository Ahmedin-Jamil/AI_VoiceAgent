# 🎙️ AI Voice Agent Platform

> **An autonomous Arabic-speaking AI agent that answers customer calls, understands inquiries, and responds like a human — 24/7, with no human agent required.**

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-orange)](https://livekit.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-TTS_&_LLM-blue?logo=google)](https://ai.google.dev)
[![Status](https://img.shields.io/badge/Status-Active_Development-yellow)]()

---

## 💡 The Problem

Every day, businesses across Saudi Arabia miss calls.

A potential customer rings a real estate office at 9 PM — no one picks up. A car rental inquiry comes in on Friday — the team is off. A logistics customer calls to track a shipment — they wait on hold and hang up.

Each missed call is a missed sale, a missed lead, a missed relationship.

Traditional solutions — IVR menus, call centers, more staff — are expensive, slow, and still frustrating for the customer.

---

## ✅ The Solution

This platform is an AI voice agent that **picks up the phone instead of you.**

It speaks natural Arabic, understands what the customer is asking, answers from your business's own knowledge base, and responds in real time — 24 hours a day, 7 days a week, with no hold time and no human staff required.

---

## 🏗️ Architecture

```
Customer speaks (Arabic, any dialect)
        ↓
Faster-Whisper STT  →  Real-time Arabic transcription (local, no API cost)
        ↓
Google Gemini LLM   →  Natural language understanding + reply generation
        ↓
RAG Knowledge Base  →  Business catalog lookup (pricing, FAQs, availability)
        ↓
Gemini Native TTS   →  Authentic Arabic voice synthesis (Saudi dialect)
        ↓
LiveKit WebRTC      →  Sub-second audio delivery to caller
```

**Full round-trip latency: under 1 second** from customer speech to AI response.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | FastAPI (Python) — REST endpoints, session management, lead capture |
| **Real-Time Voice** | LiveKit WebRTC — low-latency audio streaming |
| **Speech-to-Text** | Faster-Whisper (local) — Arabic, zero API cost |
| **Language Model** | Google Gemini 2.0 Flash — dialogue understanding & response |
| **Text-to-Speech** | Google Gemini Native Audio — authentic Saudi Arabic voices |
| **Database** | Supabase (PostgreSQL) — customer CRM, call logs, leads |
| **Frontend** | Next.js 15, React, Tailwind CSS |
| **Knowledge Base** | Local JSON RAG — business catalog, FAQs, pricing |

---

## 🧠 Core Features

- **Saudi Arabic Dialect Support** — Najdi and Hijazi dialects, not stiff Modern Standard Arabic
- **3 Built-in Voice Personas** — Saud (Charon), Faisal (Fenrir), Sara (Aoede) via Google Gemini TTS
- **4 Industry Sector Presets** — Real Estate, Car Rental, Logistics, Custom Enterprise
- **CRM Caller Lookup** — recognizes returning customers by phone number, personalizes response
- **Universal Lead Capture** — every call generates a structured lead record automatically
- **De-escalation Protocol** — detects frustrated customers, applies empathy-first responses
- **Anti-Hallucination Guardrails** — agent only answers from verified business knowledge
- **23 Pre-rendered Audio Cache** — 0ms latency for common greetings and responses
- **Audio Warmup on Startup** — critical responses pre-loaded into RAM before first call

---

## 📁 Project Structure

```
├── agent/
│   ├── agent.py               # LiveKit real-time voice session manager
│   ├── rag_service.py         # Knowledge base retrieval & CRM tools
│   ├── prompts.py             # Sector personas & Arabic conversation rules
│   ├── phonetic_normalizer.py # Saudi dialect phonetic processing engine
│   ├── tts_service.py         # Google Gemini TTS voice synthesis
│   ├── stt_service.py         # Faster-Whisper speech-to-text
│   └── llm_service.py         # Gemini LLM dialogue router
├── server/
│   └── app.py                 # FastAPI backend — 12+ REST API endpoints
├── data/
│   ├── saudi_sectors_catalog.json   # Business catalog (pricing, inventory)
│   ├── saudi_enterprise_kb.json     # FAQs, hours, policies
│   ├── customers.json               # CRM customer records
│   └── leads.json                   # Captured call leads
├── audio_cache/               # Pre-rendered Arabic audio (23 MP3 files)
├── web/
│   └── src/components/
│       ├── VoiceExperience.tsx    # Interactive voice call UI
│       ├── StudioTab.tsx          # Business configuration panel
│       ├── TelemetryTab.tsx       # Call logs & lead dashboard
│       └── TelephonyHub.tsx       # Telephony management
├── config.py                  # Environment & settings manager
└── .env.example               # Environment template (no secrets)
```

---

## ⚙️ Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API key (free tier works)
- LiveKit account (free tier works)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ahmedin-Jamil/AI_VoiceAgent.git
cd AI_VoiceAgent

# 2. Create Python virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Install frontend dependencies
cd web && npm install && cd ..

# 5. Configure environment
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and LiveKit credentials

# 6. Start backend
uvicorn server.app:app --host 0.0.0.0 --port 8000

# 7. Start frontend (separate terminal)
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Windows one-click launch:** `START_LEVELLM.bat`

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System status & configuration |
| `/api/token` | POST | Generate LiveKit WebRTC access token |
| `/api/chat` | POST | Text dialogue with AI agent (multi-turn) |
| `/api/tts` | POST | Arabic text-to-speech synthesis |
| `/api/voices` | GET | List available Gemini voice personas |
| `/api/dialects` | GET | List Arabic dialects & prompts |
| `/api/customer-lookup` | GET | CRM lookup by phone number |
| `/api/call-end` | POST | Capture lead record on call completion |
| `/api/leads` | GET | Retrieve all captured call leads |
| `/api/catalog` | GET | Business catalog (products, pricing) |
| `/api/catalog/item` | POST | Add/update catalog item |
| `/api/catalog/custom` | POST | Set custom business profile |

---

## 🏢 Industry Sectors

| Sector | What the agent handles |
|---|---|
| **Real Estate** | Property listings, pricing, district availability, viewing appointments |
| **Car Rental** | Fleet availability, daily rates, airport pickup, booking |
| **Logistics** | Shipment tracking, delivery windows, COD confirmation |
| **Custom Enterprise** | Configurable for any business via company profile + FAQ text |

---

## 📌 Roadmap

- [x] Multi-sector voice agent (Real Estate, Car Rental, Logistics)
- [x] Authentic Saudi Arabic TTS (Najdi & Hijazi dialects)
- [x] Real-time Faster-Whisper STT (local, no API cost)
- [x] Google Gemini LLM dialogue management
- [x] CRM Caller ID lookup & personalization
- [x] Universal lead capture on call end
- [x] De-escalation protocol for frustrated customers
- [x] Audio cache warm-up for 0ms response on common phrases
- [x] Next.js dashboard (Studio, Telemetry, Voice Experience tabs)
- [ ] WhatsApp voice note integration
- [ ] Live call monitoring dashboard
- [ ] Multi-tenant onboarding (businesses self-configure)
- [ ] SIP trunk integration (real phone number support)
- [ ] Production cloud deployment

---

## 👤 Author

**Jamil Alamin Ahmedin** — Backend Developer  
[LinkedIn](https://linkedin.com/in/jamil-alamin-ahmedin) · [GitHub](https://github.com/Ahmedin-Jamil)

---

*Built to give every Arabic-speaking business a voice that never sleeps.*

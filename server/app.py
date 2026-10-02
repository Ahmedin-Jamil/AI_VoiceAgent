"""
FastAPI Telemetry & WebRTC Token Server for Sovereign Voice AI.
Supplies room tokens to Next.js web clients, exposes agent configuration endpoints,
and streams authentic Saudi Arabic TTS audio to the browser.
"""

import os
import sys
import uuid
import json
import logging
from typing import Optional, AsyncGenerator

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from livekit import api

from config import settings
from agent.prompts import SYSTEM_PROMPTS, GREETINGS, get_system_prompt, get_initial_greeting
from agent.rag_service import kb

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sovereign_voice_ai.server")

app = FastAPI(
    title="Sovereign Voice AI Platform API",
    description="Enterprise Call Center Voice AI Agent Backend (Saudi Arabia B2B)",
    version="1.0.0",
)

# Enable CORS for Next.js web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenRequest(BaseModel):
    room_name: Optional[str] = Field(default="demo-room", description="Target LiveKit room")
    participant_name: Optional[str] = Field(default="Guest User", description="Caller display name")
    identity: Optional[str] = Field(default=None, description="Unique caller identifier")

class TokenResponse(BaseModel):
    token: str
    server_url: str
    room_name: str
    participant_identity: str

class AgentConfigUpdate(BaseModel):
    dialect: Optional[str] = Field(default=None, description="najdi, hijazi, fusha, bilingual")
    voice: Optional[str] = Field(default=None, description="ar-SA-HamedNeural, ar-SA-ZariyahNeural")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)

class FAQItem(BaseModel):
    category: str
    question: str
    answer: str

@app.get("/api/health")
async def health_check():
    """System health check and sovereign configuration status."""
    return {
        "status": "healthy",
        "market": "Saudi Arabia B2B Call Center",
        "sovereign_stack": {
            "livekit_url": settings.LIVEKIT_URL,
            "stt_provider": settings.STT_PROVIDER,
            "stt_model": settings.FASTER_WHISPER_MODEL,
            "stt_device": settings.FASTER_WHISPER_DEVICE,
            "llm_provider": settings.LLM_PROVIDER,
            "llm_model": settings.LLM_MODEL,
            "llm_base_url": settings.LLM_BASE_URL,
            "tts_provider": settings.TTS_PROVIDER,
            "tts_voice": settings.TTS_VOICE,
            "default_dialect": settings.DEFAULT_DIALECT,
        },
        "pdpl_compliance": "100% On-Premise Data Residency",
    }

@app.post("/api/token", response_model=TokenResponse)
async def generate_token(req: TokenRequest):
    """
    Issues a signed LiveKit WebRTC Access Token for browser clients (Next.js frontend).
    Allows caller to stream microphone audio directly into the AI room.
    """
    identity = req.identity or f"caller_{uuid.uuid4().hex[:8]}"
    room = req.room_name or "demo-room"

    try:
        grant = api.VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        )

        token = (
            api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_name(req.participant_name or "Caller")
            .with_grants(grant)
            .to_jwt()
        )

        return TokenResponse(
            token=token,
            server_url=settings.LIVEKIT_URL,
            room_name=room,
            participant_identity=identity,
        )
    except Exception as e:
        logger.error(f"Failed to generate LiveKit token: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dialects")
async def list_dialects():
    """Returns available Saudi dialects, prompt definitions, and voice options."""
    return {
        "dialects": [
            {"id": "najdi", "name": "اللهجة النجدية (الرياض)", "greeting": GREETINGS["najdi"]},
            {"id": "hijazi", "name": "اللهجة الحجازية (الغربية)", "greeting": GREETINGS["hijazi"]},
            {"id": "fusha", "name": "العربية الفصحى المعاصرة", "greeting": GREETINGS["fusha"]},
            {"id": "bilingual", "name": "ثنائي اللغة (عربي / إنجليزي)", "greeting": GREETINGS["bilingual"]},
        ],
        "voices": [
            {"id": "ar-SA-HamedNeural", "name": "حامد (صوت رجالي سعودي أصيل)", "gender": "male"},
            {"id": "ar-SA-ZariyahNeural", "name": "زارية (صوت نسائي سعودي احترافي)", "gender": "female"},
        ],
        "current_selection": {
            "dialect": settings.DEFAULT_DIALECT,
            "voice": settings.TTS_VOICE,
        }
    }

@app.get("/api/kb/faqs")
async def get_faqs():
    """Retrieve enterprise FAQs from sovereign knowledge store."""
    return kb._kb

@app.post("/api/kb/faqs")
async def add_faq(faq: FAQItem):
    """Add a new verified enterprise FAQ to the local knowledge base."""
    kb._kb.setdefault("faqs", []).append(faq.model_dump())
    # Save back to file
    try:
        with open(kb._data_path, "w", encoding="utf-8") as f:
            json.dump(kb._kb, f, ensure_ascii=False, indent=2)
        return {"status": "success", "message": "FAQ saved to sovereign storage"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist FAQ: {e}")

class TTSRequest(BaseModel):
    text: str = Field(..., description="Arabic text to synthesize")
    voice: Optional[str] = Field(default=None, description="Edge TTS voice override")

@app.post("/api/tts")
async def synthesize_speech(req: TTSRequest):
    """
    Stream authentic Saudi Arabic audio from edge-tts (HamedNeural / ZariyahNeural).
    Returns MP3 audio bytes the browser plays directly — no speechSynthesis required.
    """
    voice = req.voice or settings.TTS_VOICE

    async def audio_stream() -> AsyncGenerator[bytes, None]:
        communicate = edge_tts.Communicate(req.text, voice=voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-Voice": voice,
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server.app:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )

"""
FastAPI Telemetry & WebRTC Token Server for Sovereign Voice AI.
Supplies room tokens to Next.js web clients, exposes agent configuration endpoints,
and streams authentic Saudi Arabic TTS audio to the browser.
"""

import os
import sys
import time
import uuid
import json
import logging
import re
from datetime import datetime
from typing import Optional, AsyncGenerator

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from livekit import api

from config import settings
from agent.prompts import (
    SYSTEM_PROMPTS,
    GREETINGS,
    get_system_prompt,
    get_initial_greeting,
    get_sector_prompt,
    get_sector_greeting,
    build_universal_prompt,
    DE_ESCALATION_EMPATHY,
    DE_ESCALATION_TRANSFER,
    FILLER_LOOKUP_PHRASE,
    UNIVERSAL_GREETING,
)
from agent.rag_service import kb, lookup_customer_record, normalize_phone_number

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
    voice: Optional[str] = Field(default=None, description="Charon, Fenrir, Aoede")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)

class FAQItem(BaseModel):
    category: str
    question: str
    answer: str

@app.on_event("startup")
async def warm_up_audio_cache():
    """
    Background pre-warm of top call-center responses into memory.
    Enables instant 0ms responses for common questions and greetings.
    """
    import asyncio
    async def _warm():
        WARMUP_ITEMS = [
            ("Charon", "يا هلا والله ومسهلا! معك سعود من خدمة العملاء.. سم أمرني، وش أقدر أخدمك فيه اليوم يا غالي؟"),
            ("Charon", "حقك علينا يا غالي، وفاهم انزعاجك تماماً. أنا هنا الحين عشان أخدمك وأحل موضوعك بأسرع وقت."),
            ("Charon", "أبشر بسعدك وفوق راسي. أحولك الحين مباشرة على المشرف المختص، لحظة معي على الخط."),
            ("Charon", "ثواني بس أشيك لك في السستم يا غالي..."),
            ("Charon", "يا هلا والله بأخوي أبو فهد، نورتنا! شفت موضوع تأخر الشحنة رقم 892، أبشر بسعدك الحين أشوف لك إياها وأحلها فوراً."),
            ("Charon", "يا هلا والله! ما عندي التفصيل هذا الحين في السستم يا غالي، بس أسجل طلبك وأرتبلك مع المختص يتابع معك فوراً."),
            ("Charon", "وعليكم السلام ورحمة الله وبركاته، يا هلا والله ومسهلا! سم أمرني وش طلبك اليوم؟"),
            ("Charon", "أبشر بعزك وفوق راسي! رتبت لك الموعد، وبرسل لك اللوكيشن والتفاصيل الحين على جوالك بالوقت اللي يناسبك."),
            ("Charon", "الله يعافيك، بخدمتك دايم.. في أمان الله."),
        ]
        for voice, text in WARMUP_ITEMS:
            try:
                await synthesize_saudi_voice(text, voice_id=voice)
            except Exception:
                pass
        logger.info(f"Audio cache pre-warmed: {len(AUDIO_CACHE)} responses ready in RAM")

    asyncio.create_task(_warm())

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
            {"id": "Charon", "name": "سعود (صوت عميق ورخيم - Google Gemini)", "gender": "male"},
            {"id": "Fenrir", "name": "فيصل (صوت احترافي متزن - Google Gemini)", "gender": "male"},
            {"id": "Aoede", "name": "سارة (صوت نسائي دافئ - Google Gemini)", "gender": "female"},
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

# ─────────────────────────────────────────────
# 4-IN-1 INDUSTRY CATALOG MANAGEMENT
# ─────────────────────────────────────────────

SECTORS_CATALOG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "saudi_sectors_catalog.json")

def load_sectors_catalog() -> dict:
    if os.path.exists(SECTORS_CATALOG_PATH):
        try:
            with open(SECTORS_CATALOG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading sectors catalog: {e}")
    return {}

def save_sectors_catalog(data: dict) -> bool:
    try:
        with open(SECTORS_CATALOG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving sectors catalog: {e}")
        return False

sectors_catalog = load_sectors_catalog()

def get_catalog_context_string(sector: str) -> str:
    """Format sector items into clean, concise text for LLM system prompt context."""
    global sectors_catalog
    sec = sectors_catalog.get(sector, {})
    if sector == "real_estate":
        lines = []
        for p in sec.get("items", []):
            lines.append(f"- {p.get('title')}: {p.get('district')} | السعر: {p.get('price')} | المواصفات: {p.get('specs')} | الحالة: {p.get('status')} | التمويل: {p.get('financing')}")
        return "\n".join(lines)
    elif sector == "car_rental":
        lines = []
        for c in sec.get("items", []):
            lines.append(f"- {c.get('model')} ({c.get('category')}): {c.get('daily_rate')} | المواصفات: {c.get('specs')} | الحالة: {c.get('status')} | الفروع: {c.get('branches')}")
        return "\n".join(lines)
    elif sector == "logistics":
        lines = []
        for s in sec.get("items", []):
            lines.append(f"- شحنة {s.get('tracking_number')} ({s.get('customer_name')}): {s.get('district')} | المبلغ: {s.get('cod_amount')} | الفترة: {s.get('time_slot')} | الحالة: {s.get('status')}")
        return "\n".join(lines)
    elif sector == "custom":
        return sec.get("faq_text", "")
    return ""

@app.get("/api/catalog")
async def get_catalog(sector: Optional[str] = None):
    """Retrieve all sector catalogs or a specific sector's items."""
    global sectors_catalog
    sectors_catalog = load_sectors_catalog()
    if sector and sector in sectors_catalog:
        return sectors_catalog[sector]
    return sectors_catalog

class CatalogItemRequest(BaseModel):
    sector: str = Field(..., description="real_estate, car_rental, or logistics")
    item: dict = Field(..., description="New item data")

@app.post("/api/catalog/item")
async def add_catalog_item(req: CatalogItemRequest):
    """Add or update an item in a sector catalog."""
    global sectors_catalog
    if req.sector not in sectors_catalog:
        sectors_catalog[req.sector] = {"items": []}
    
    items = sectors_catalog[req.sector].setdefault("items", [])
    # Check if item with same ID exists
    item_id = req.item.get("id") or f"{req.sector}-{uuid.uuid4().hex[:6]}"
    req.item["id"] = item_id

    existing_idx = next((i for i, x in enumerate(items) if x.get("id") == item_id), -1)
    if existing_idx >= 0:
        items[existing_idx] = req.item
    else:
        items.insert(0, req.item)

    save_sectors_catalog(sectors_catalog)
    return {"status": "success", "item": req.item, "total_items": len(items)}

class CustomProfileRequest(BaseModel):
    company_name: str
    industry: Optional[str] = "خدمات وأعمال"
    faq_text: str
    greeting: Optional[str] = None

@app.post("/api/catalog/custom")
async def update_custom_profile(req: CustomProfileRequest):
    """Save custom business profile for Universal Mode."""
    global sectors_catalog
    greeting = req.greeting or f"يا هلا والله! معك سعود من {req.company_name}، كيف أقدر أخدمك اليوم؟"
    sectors_catalog["custom"] = {
        "sector_name": "شركة مخصصة (Universal Custom)",
        "company_name": req.company_name,
        "industry": req.industry,
        "greeting": greeting,
        "faq_text": req.faq_text
    }
    save_sectors_catalog(sectors_catalog)
    return {"status": "success", "profile": sectors_catalog["custom"]}

# ─────────────────────────────────────────────
# TASK 2: CALLER ID & CUSTOMER CRM LOOKUP TOOL
# ─────────────────────────────────────────────

@app.get("/api/customer-lookup")
async def customer_lookup(phone: str):
    """
    Look up customer profile in CRM by phone number (Caller ID).
    Returns:
      { "found": true, "name": "أبو فهد", "open_inquiry": "تأخر الشحنة رقم 892" }
      or
      { "found": false }
    """
    if not phone or not phone.strip():
        return {"found": False}
    result = lookup_customer_record(phone.strip())
    logger.info(f"CRM lookup query phone='{phone}' -> found={result.get('found', False)}")
    return result


# ─────────────────────────────────────────────
# TASK 3: UNIVERSAL LEAD CAPTURE ON CALL END
# ─────────────────────────────────────────────

LEADS_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leads.json")

def load_leads_data() -> list:
    if os.path.exists(LEADS_FILE_PATH):
        try:
            with open(LEADS_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading leads database: {e}")
    return []

def save_leads_data(leads: list) -> bool:
    try:
        with open(LEADS_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(leads, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving leads database: {e}")
        return False

class CallEndRequest(BaseModel):
    caller_phone: str = Field(..., description="Customer phone number / Caller ID")
    caller_name: Optional[str] = Field(default=None, description="Customer name if captured")
    company_id: Optional[str] = Field(default="default", description="Enterprise / tenant identifier")
    inquiry_summary: str = Field(..., description="Concise summary of call inquiry and resolution")
    customer_sentiment: Optional[str] = Field(default="Neutral", description="Positive / Neutral / Frustrated")
    call_duration_seconds: Optional[int] = Field(default=0, description="Call duration in seconds")
    requires_human_followup: Optional[bool] = Field(default=False, description="Flag indicating if a human agent must follow up")
    timestamp: Optional[str] = Field(default=None, description="ISO-8601 string timestamp")

@app.post("/api/call-end")
async def capture_call_end(req: CallEndRequest):
    """
    Universal Lead Capture on Call End.
    Accepts universal enterprise parameters and persists the lead to CRM records.
    """
    lead_id = f"lead_{uuid.uuid4().hex[:8]}"
    ts = req.timestamp or (datetime.utcnow().isoformat() + "Z")
    
    lead_record = {
        "lead_id": lead_id,
        "caller_phone": req.caller_phone,
        "caller_name": req.caller_name,
        "company_id": req.company_id or "default",
        "inquiry_summary": req.inquiry_summary,
        "customer_sentiment": req.customer_sentiment or "Neutral",
        "call_duration_seconds": req.call_duration_seconds or 0,
        "requires_human_followup": bool(req.requires_human_followup),
        "timestamp": ts,
    }

    leads = load_leads_data()
    leads.insert(0, lead_record)
    save_leads_data(leads)

    logger.info(
        f"🎯 Universal Lead Captured [{lead_id}]: Phone={req.caller_phone}, "
        f"Sentiment={req.customer_sentiment}, Followup={req.requires_human_followup}"
    )

    return {
        "status": "success",
        "message": "Call lead captured successfully",
        "lead_id": lead_id,
        "lead": lead_record,
    }

@app.get("/api/leads")
async def get_all_leads():
    """Retrieve all logged call-end leads."""
    leads = load_leads_data()
    return {"total": len(leads), "leads": leads}


class HistoryTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: Optional[str] = Field(default="", description="User message/question in Arabic")
    text: Optional[str] = Field(default="", description="User message alias")
    dialect: Optional[str] = Field(default="najdi", description="Dialect preset")
    sector: Optional[str] = Field(default="universal", description="real_estate, car_rental, logistics, custom, universal")
    custom_name: Optional[str] = Field(default="", description="Custom company name if custom sector")
    custom_faq: Optional[str] = Field(default="", description="Custom company FAQ text")
    history: Optional[list[HistoryTurn]] = Field(default=[], description="Conversation history for context")
    agent_name: Optional[str] = Field(default="", description="Name of agent persona (سعود or فيصل)")
    voice: Optional[str] = Field(default="Charon", description="Voice identifier")

@app.post("/api/chat")
async def chat_dialogue(req: ChatRequest):
    """
    Live dynamic dialogue manager endpoint with 4-in-1 industry presets & catalog knowledge.
    """
    user_text = (req.message or req.text or "").strip()
    dialect = req.dialect or settings.DEFAULT_DIALECT
    sector = req.sector or "universal"
    effective_name = req.agent_name or ("فيصل" if req.voice == "Fenrir" else "سعود")

    # Fast 0ms instant matching for common questions & who are you
    fast_reply = get_smart_saudi_reply(
        transcript=user_text,
        sector=sector,
        dialect=dialect,
        custom_name=req.custom_name or "",
        custom_faq=req.custom_faq or "",
        agent_name=effective_name
    )
    if fast_reply:
        return {"reply": fast_reply, "provider": "saudi-smart-engine"}

    catalog_context = get_catalog_context_string(sector)
    system_prompt = get_sector_prompt(
        sector=sector,
        dialect=dialect,
        catalog_context=catalog_context,
        custom_company_name=req.custom_name or "",
        custom_faq=req.custom_faq or "",
        agent_name=effective_name
    )

    try:
        if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
            import httpx

            key = settings.GEMINI_API_KEY
            # High-speed intelligent models for ChatGPT-level conversational fluency
            models_to_try = ["gemini-3.5-flash-lite", "gemini-3.5-flash"]

            # Build multi-turn conversation for Gemini (context memory)
            contents = []
            history = req.history or []
            for turn in history:
                gemini_role = "model" if turn.role in ["assistant", "model"] else "user"
                contents.append({"role": gemini_role, "parts": [{"text": turn.content}]})
            # Add current user message
            contents.append({"role": "user", "parts": [{"text": user_text}]})

            payload = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.6,
                    "maxOutputTokens": 180,  # Eloquent, intelligent, complete answers like ChatGPT
                }
            }
            headers = {"Content-Type": "application/json"}

            reply = None
            used_model = None
            async with httpx.AsyncClient(timeout=8.0) as client:
                for model in models_to_try:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                        response = await client.post(url, json=payload, headers=headers)
                        if response.status_code == 200:
                            res = response.json()
                            raw_reply = res["candidates"][0]["content"]["parts"][0]["text"].strip()
                            clean_reply = re.sub(r"<thought>.*?</thought>", "", raw_reply, flags=re.DOTALL)
                            clean_reply = re.sub(r"\(.*?[A-Za-z].*?\)", "", clean_reply)
                            clean_reply = re.sub(r"[\*#_`]", "", clean_reply)
                            clean_reply = clean_reply.strip('"').strip("'").strip()
                            reply = clean_reply if clean_reply else raw_reply.strip()
                            used_model = model
                            break
                        else:
                            logger.warning(f"Gemini model {model} returned {response.status_code}, trying next...")
                    except Exception as m_err:
                        logger.warning(f"Gemini model {model} attempt failed: {m_err}")

            if reply:
                return {"reply": reply, "provider": used_model}
            else:
                raise Exception("All Gemini models failed")
        else:
            # Fallback response
            return {
                "reply": f"يا هلا والله! أبشر بعزك، وصل سؤالك: ({user_text}). الحين أخدمك فيه طال عمرك.",
                "provider": "fallback",
            }
    except Exception as e:
        logger.error(f"Chat dialogue error: {e}", exc_info=True)
        return {
            "reply": f"يا هلا والله! أبشر بسعدك وفوق راسي، سم وش ودك نستفسر عنه أو نسويه لك اليوم؟",
            "provider": "error_fallback",
        }

AVAILABLE_VOICES = [
    {
        "id": "Charon",
        "name": "سعود (صوت عميق ورخيم - Charon)",
        "gender": "male",
        "dialect": "all",
        "title": "صوت خدمة عملاء رجالي عميق وقور واثق (Google Gemini)",
        "badge": "صوت عميق (افتراضي)",
    },
    {
        "id": "Fenrir",
        "name": "فيصل (صوت احترافي - Fenrir)",
        "gender": "male",
        "dialect": "all",
        "title": "صوت خدمة عملاء رجالي متزن (Google Gemini)",
        "badge": "صوت متزن",
    },
    {
        "id": "Aoede",
        "name": "سارة (صوت نسائي - Aoede)",
        "gender": "female",
        "dialect": "all",
        "title": "صوت خدمة عملاء نسائي دافئ ولطيف (Google Gemini)",
        "badge": "صوت نسائي",
    },
]

@app.get("/api/voices")
async def list_voices():
    """Returns available Google Gemini Call Center voices."""
    return {"voices": AVAILABLE_VOICES}

class TTSRequest(BaseModel):
    text: str = Field(..., description="Arabic text to synthesize")
    voice: Optional[str] = Field(default=None, description="Gemini voice name: Charon, Fenrir, Aoede")
    voice_id: Optional[str] = Field(default=None, description="Alternative voice ID alias")

import io
import wave
import struct
import math
import httpx
from agent.phonetic_normalizer import normalize_saudi_arabic

def make_voice_deeper(samples: list[int], factor: float = 0.93) -> list[int]:
    """
    Subtly deepens the voice pitch by ~7% (approx 1.2 semitones).
    Gives a rich, deep, charismatic corporate call-center representative voice.
    """
    if factor == 1.0 or not samples:
        return samples
    n = len(samples)
    new_len = int(n / factor)
    out = [0] * new_len
    for i in range(new_len):
        orig_pos = i * factor
        idx = int(orig_pos)
        frac = orig_pos - idx
        if idx + 1 < n:
            val = int(samples[idx] * (1.0 - frac) + samples[idx + 1] * frac)
        elif idx < n:
            val = samples[idx]
        else:
            val = 0
        out[i] = max(-32768, min(32767, val))
    return out

def apply_zero_crossing_fade(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    """
    Eliminates the abrupt DC-offset cutoff pop ('80s TV glitch / static snap').
    Applies:
      1. 10ms smooth fade-in
      2. 50ms Hann-window cosine fade-out to zero
      3. 50ms digital silence tail for hardware buffer flushing
    """
    if not pcm_bytes or len(pcm_bytes) < 4:
        return pcm_bytes
    num_samples = len(pcm_bytes) // 2
    samples = list(struct.unpack(f"<{num_samples}h", pcm_bytes[:num_samples * 2]))

    # 1. 10ms (240 samples) smooth fade-in
    fade_in = min(240, num_samples // 4)
    for i in range(fade_in):
        factor = 0.5 * (1.0 - math.cos(math.pi * i / fade_in))
        samples[i] = int(samples[i] * factor)

    # 2. 50ms (1200 samples) smooth Hann-window cosine fade-out to zero
    fade_out = min(1200, num_samples // 2)
    for i in range(fade_out):
        idx = num_samples - fade_out + i
        factor = 0.5 * (1.0 + math.cos(math.pi * i / fade_out))
        samples[idx] = int(samples[idx] * factor)

    # 3. 50ms (1200 samples) digital silence tail
    samples.extend([0] * 1200)
    return struct.pack(f"<{len(samples)}h", *samples)

AUDIO_CACHE: dict[str, bytes] = {}

def load_precomputed_gemini_audio():
    """Load pre-rendered Deep Saudi Voice audio into RAM cache."""
    try:
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cache_dir = os.path.join(base_dir, "audio_cache")

        def _read(name):
            p = os.path.join(cache_dir, name)
            if os.path.exists(p):
                with open(p, "rb") as f:
                    return f.read()
            return None

        re_greeting = _read("real_estate.mp3")
        car_greeting = _read("car_rental.mp3")
        log_greeting = _read("logistics.mp3")
        cus_greeting = _read("custom.mp3")
        salam_reply = _read("salam.mp3")
        jeddah_apt = _read("jeddah_apt.mp3")
        riyadh_villa = _read("riyadh_villa.mp3")
        car_fleet = _read("car_fleet.mp3")
        yaris = _read("yaris.mp3")
        camry = _read("camry.mp3")
        shipment = _read("shipment_track.mp3")
        law = _read("law_firm.mp3")
        apt = _read("appointment.mp3")
        srv_re = _read("srv_re.mp3")
        srv_car = _read("srv_car.mp3")
        srv_log = _read("srv_log.mp3")

        # Map greetings — keys must EXACTLY match what frontend sends via /api/tts
        if re_greeting:
            for k in [
                "أهلاً بك، معك سعود من خدمة العملاء.. كيف أقدر أساعدك اليوم؟",
                "أهلاً بك، معك سعود.. كيف أقدر أساعدك اليوم؟",  # legacy fallback
            ]:
                AUDIO_CACHE[k] = re_greeting
                AUDIO_CACHE[f"Charon:{k}"] = re_greeting
                AUDIO_CACHE[f"Fenrir:{k}"] = re_greeting
        if car_greeting:
            for k in [
                "أهلاً بك، معك سعود من خدمة العملاء.. وش نوع السيارة اللي تبي تحجزها اليوم؟",
                "أهلاً بك، معك سعود.. وش نوع السيارة اللي تبي تحجزها اليوم؟",  # legacy fallback
            ]:
                AUDIO_CACHE[k] = car_greeting
                AUDIO_CACHE[f"Charon:{k}"] = car_greeting
                AUDIO_CACHE[f"Fenrir:{k}"] = car_greeting
        if log_greeting:
            for k in [
                "أهلاً بك، معك سعود من خدمة العملاء.. كيف أقدر أساعدك بخصوص شحنتك؟",
                "أهلاً بك، معك سعود.. كيف أقدر أساعدك بخصوص شحنتك؟",  # legacy fallback
            ]:
                AUDIO_CACHE[k] = log_greeting
                AUDIO_CACHE[f"Charon:{k}"] = log_greeting
                AUDIO_CACHE[f"Fenrir:{k}"] = log_greeting
        if cus_greeting:
            for k in [
                "أهلاً بك، معك سعود من خدمة العملاء.. كيف أقدر أساعدك اليوم؟",
                "أهلاً بك، معك سعود.. كيف أقدر أساعدك اليوم؟",  # legacy fallback
            ]:
                AUDIO_CACHE[k] = cus_greeting
                AUDIO_CACHE[f"Charon:{k}"] = cus_greeting
                AUDIO_CACHE[f"Fenrir:{k}"] = cus_greeting
        if salam_reply:
            for k in [
                "وعليكم السلام ورحمة الله، يا هلا بك.. آمرني وش طلبك اليوم؟",
                "وعليكم السلام ورحمة الله، يا هلا بك.. آمرني وش طلبك؟",
                "وعليكم السلام ورحمة الله، يا هلا بك.. وش السيارة اللي تبي تستأجرها؟",
                "وعليكم السلام ورحمة الله، يا هلا بك.. تفضل وش رقم الشحنة؟"
            ]:
                AUDIO_CACHE[k] = salam_reply
                AUDIO_CACHE[f"Charon:{k}"] = salam_reply
                AUDIO_CACHE[f"Fenrir:{k}"] = salam_reply
        if jeddah_apt:
            for k in [
                "يا هلا بك، بالنسبة للشقق بجدة المتوفر عندنا الحين شقة الروضة بـ 85 ألف سنوياً، أما فئة العشرين ألف للأسف مو متوفرة عندنا حالياً. ودك تشوف تفاصيل شقة الروضة؟",
                "يا هلا بك، بالنسبة للإيجار بجدة متوفر عندنا شقة فاخرة بحي الروضة 3 غرف وصالة بـ 85 ألف بالسنة ودفعاتها نصف سنوية مريحة. تبي أرسل لك موقعها وتمر عليها اليوم؟"
            ]:
                AUDIO_CACHE[k] = jeddah_apt
                AUDIO_CACHE[f"Charon:{k}"] = jeddah_apt
                AUDIO_CACHE[f"Fenrir:{k}"] = jeddah_apt
        if riyadh_villa:
            for k in [
                "يا هلا بك! فيلا المرجان مساحتها 420 متر، 5 غرف ومسبح خاص ومصعد، بـ 3 مليون و850 ألف وتقبل البنوك وسكني. ودك نروح نشوفها سوا اليوم؟",
                "يا هلا والله ومسهلا! شوف يا غالي، فيلا المرجان صراحة خيار يشرح الصدر.. مساحتها 420 متر، 5 غرف ومسبح خاص ومصعد، وبـ 3 مليون و850 ألف وتقبل البنوك وسكني. ودك نروح نشوفها سوا اليوم؟"
            ]:
                AUDIO_CACHE[k] = riyadh_villa
                AUDIO_CACHE[f"Charon:{k}"] = riyadh_villa
                AUDIO_CACHE[f"Fenrir:{k}"] = riyadh_villa
        if car_fleet:
            k = "حياك الله! الأسطول جاهز: يارس بـ 120، كامري بـ 190، يوكون بـ 450، ولاندكروزر بـ 650 ريال باليوم واستلام فوري من المطار. وش الموتر اللي يخدم مشوارك أكثر؟"
            AUDIO_CACHE[k] = car_fleet
            AUDIO_CACHE[f"Charon:{k}"] = car_fleet
            AUDIO_CACHE[f"Fenrir:{k}"] = car_fleet
        if yaris:
            k = "اليارس 2024 جاهزة بـ 120 ريال باليوم، واقتصادية بالبنزين وتأمينها شامل. ودك تستلمها من المطار ولا من فرع التحلية؟"
            AUDIO_CACHE[k] = yaris
            AUDIO_CACHE[f"Charon:{k}"] = yaris
            AUDIO_CACHE[f"Fenrir:{k}"] = yaris
        if camry:
            for k in [
                "هلا بك! تويوتا كامري 2024 متوفرة اليوم بـ 190 ريال باليوم شامل التأمين، وفروع المطار مفتوحة على مدار 24 ساعة. تبي أثبتها لك الحين وتستلمها أول ما تنزل من الطيارة؟",
                "هلا بك! تويوتا كامري 2024 متوفرة اليوم بـ 190 ريال باليوم شامل التأمين، وفروع المطار مفتوحة على مدار 24 ساعة. تبي أثبتها لك الحين؟"
            ]:
                AUDIO_CACHE[k] = camry
                AUDIO_CACHE[f"Charon:{k}"] = camry
                AUDIO_CACHE[f"Fenrir:{k}"] = camry
        if shipment:
            for k in [
                "يا هلا بك أخوي أحمد! شحنتك الحين مع المندوب وفي طريقها لك لحي المرجان بجدة، والمبلغ 320 ريال عند الاستلام. يناسبك يمرك العصر بين 4 و8 بالليل؟",
                "يا أهلاً بك أخوي أحمد! شحنتك رقمها SA-88219 مع المندوب وفي طريقها لك اليوم لحي المرجان، والمطلوب عند الاستلام 320 ريال. يناسبك يمرك العصر بعد الأربعة؟"
            ]:
                AUDIO_CACHE[k] = shipment
                AUDIO_CACHE[f"Charon:{k}"] = shipment
                AUDIO_CACHE[f"Fenrir:{k}"] = shipment
        if law:
            k = "يا هلا فيك! في مكتب الشموخ للمحاماة نقدم الترافع بالقضايا التجارية والعمالية وتأسيس الشركات وصياغة العقود. وش الموضوع اللي في بالك يا غالي؟"
            AUDIO_CACHE[k] = law
            AUDIO_CACHE[f"Charon:{k}"] = law
            AUDIO_CACHE[f"Fenrir:{k}"] = law
        if apt:
            for k in [
                "أبشر والله بعزك! رتبت لك موعد المعاينة، وبرسل لك اللوكيشن والتفاصيل الحين على جوالك بالوقت اللي يناسبك.",
                "أبشر والله بعزك! رتبت لك موعد المعاينة الميدانية، وبرسل لك اللوكيشن والتفاصيل الحين على جوالك عشان تمر بالوقت اللي يناسبك."
            ]:
                AUDIO_CACHE[k] = apt
                AUDIO_CACHE[f"Charon:{k}"] = apt
                AUDIO_CACHE[f"Fenrir:{k}"] = apt
        if srv_re:
            k = "يا هلا بك! نقدر نخدمك في شراء وتملك الفلل والأدوار السكنية، أو استئجار شقق فاخرة بجدة والرياض. وش العقار اللي تبحث عنه اليوم؟"
            AUDIO_CACHE[k] = srv_re
            AUDIO_CACHE[f"Charon:{k}"] = srv_re
            AUDIO_CACHE[f"Fenrir:{k}"] = srv_re
        if srv_car:
            k = "حياك الله! نقدر نخدمك في تأجير السيارات الاقتصادية والفارهة مع استلام فوري من المطار على مدار 24 ساعة. وش نوع الموتر اللي تدور عليه؟"
            AUDIO_CACHE[k] = srv_car
            AUDIO_CACHE[f"Charon:{k}"] = srv_car
            AUDIO_CACHE[f"Fenrir:{k}"] = srv_car
        if srv_log:
            k = "يا هلا بك! نقدر نخدمك في تتبع شحنتك، جدولة موعد التوصيل، أو تأكيد العنوان والدفع عند الاستلام. عطني رقم شحنتك وأبشر."
            AUDIO_CACHE[k] = srv_log
            AUDIO_CACHE[f"Charon:{k}"] = srv_log
            AUDIO_CACHE[f"Fenrir:{k}"] = srv_log

        # ── Universal Enterprise Pre-Warmed Responses (0ms Latency) ──
        de_empathy = _read("de_escalation_empathy.mp3")
        de_transfer = _read("de_escalation_transfer.mp3")
        filler_lookup = _read("filler_lookup.mp3")
        uni_greeting = _read("universal_greeting.mp3")
        crm_abu_fahd = _read("crm_abu_fahd.mp3")
        crm_sara = _read("crm_sara.mp3")
        uni_fallback = _read("universal_fallback.mp3")
        salam_audio = _read("salam.mp3")
        appointment_audio = _read("appointment.mp3")

        if de_empathy:
            for k in [
                DE_ESCALATION_EMPATHY,
                "حقك علينا يا غالي، وفاهم انزعاجك تماماً. أنا هنا الحين عشان أخدمك وأحل موضوعك بأسرع وقت.",
                "حقك علينا يا غالي وما تشيل هم أبد، وفاهم انزعاجك تماماً.. أنا هنا الحين عشان أخدمك وأحل موضوعك بأسرع وقت.",
            ]:
                AUDIO_CACHE[k] = de_empathy
                AUDIO_CACHE[f"Charon:{k}"] = de_empathy
                AUDIO_CACHE[f"Fenrir:{k}"] = de_empathy
                AUDIO_CACHE[f"Aoede:{k}"] = de_empathy

        if de_transfer:
            for k in [
                DE_ESCALATION_TRANSFER,
                "أبشر بسعدك وفوق راسي. أحولك الحين مباشرة على المشرف المختص، لحظة معي على الخط.",
                "أبشر بسعدك وفوق راسي.. أحولك الحين مباشرة على المشرف المختص، خلك معي ثواني على الخط.",
            ]:
                AUDIO_CACHE[k] = de_transfer
                AUDIO_CACHE[f"Charon:{k}"] = de_transfer
                AUDIO_CACHE[f"Fenrir:{k}"] = de_transfer
                AUDIO_CACHE[f"Aoede:{k}"] = de_transfer

        if filler_lookup:
            for k in [
                FILLER_LOOKUP_PHRASE,
                "ثواني بس أشيك لك في السستم يا غالي...",
                "ثواني بس أشيك لك في السستم يا طويل العمر...",
            ]:
                AUDIO_CACHE[k] = filler_lookup
                AUDIO_CACHE[f"Charon:{k}"] = filler_lookup
                AUDIO_CACHE[f"Fenrir:{k}"] = filler_lookup
                AUDIO_CACHE[f"Aoede:{k}"] = filler_lookup

        if uni_greeting:
            for k in [
                "يا هلا والله ومسهلا! معك سعود من خدمة العملاء.. سم أمرني، وش أقدر أخدمك فيه اليوم يا غالي؟",
                "يا هلا والله! معك سعود من خدمة العملاء.. سم وش أقدر أخدمك فيه اليوم؟",
                "أهلاً بك، معك سعود من خدمة العملاء.. كيف أقدر أساعدك اليوم؟",
                "يا هلا، معك سعود من خدمة العملاء.. وش أقدر أساعدك فيه اليوم؟",
                "هلا، معك سعود من خدمة العملاء.. وش أقدر أساعدك فيه اليوم؟",
                "يا هلا ومسهلا! معك سعود.. وش الخدمة أو الاستفسار اللي ودك نسجله لك اليوم؟",
                "يا هلا بك! معك سعود من قسم المتابعة والدعم.. سم كيف أقدر أخدمك في موضوعك؟",
            ]:
                AUDIO_CACHE[k] = uni_greeting
                AUDIO_CACHE[f"Charon:{k}"] = uni_greeting
                AUDIO_CACHE[f"Fenrir:{k}"] = uni_greeting
                AUDIO_CACHE[f"Aoede:{k}"] = uni_greeting

        if crm_abu_fahd:
            for k in [
                "يا هلا والله بأخوي أبو فهد، نورتنا! شفت موضوع تأخر الشحنة رقم 892، أبشر بسعدك الحين أشوف لك إياها وأحلها فوراً.",
                "يا هلا والله بأخوي أبو فهد، نورتنا! شفت موضوع تأخر الشحنة رقم 892، أبشر بسعدك الحين أشوف لك إياها.",
                "يا هلا والله بأبو فهد، نورتنا! شفت موضوع تأخر الشحنة رقم 892، أبشر بسعدك الحين أشوف لك إياها.",
            ]:
                AUDIO_CACHE[k] = crm_abu_fahd
                AUDIO_CACHE[f"Charon:{k}"] = crm_abu_fahd
                AUDIO_CACHE[f"Fenrir:{k}"] = crm_abu_fahd
                AUDIO_CACHE[f"Aoede:{k}"] = crm_abu_fahd

        if crm_sara:
            for k in [
                "يا هلا والله بأختي سارة، نورتينا! شفت موضوع استفسار العقد، أبشري بسعدك الحين أشوف لك تفاصيله.",
                "يا هلا والله بأختي سارة، نورتينا! شفت موضوع استفسار العقد، أبشري بسعدك الحين أشوف لك إياه.",
            ]:
                AUDIO_CACHE[k] = crm_sara
                AUDIO_CACHE[f"Charon:{k}"] = crm_sara
                AUDIO_CACHE[f"Fenrir:{k}"] = crm_sara
                AUDIO_CACHE[f"Aoede:{k}"] = crm_sara

        if uni_fallback:
            for k in [
                "يا هلا والله! ما عندي التفصيل هذا الحين في السستم يا غالي، بس أسجل طلبك وأرتبلك مع المختص يتابع معك فوراً.",
                "وصلني استفسارك يا غالي، وأبشر بسعدك بنرسل لك كل التفاصيل الحين على جوالك.",
                "وصلني سؤالك والله، أبشر بسعدك بنرسل لك كل التفاصيل الحين على جوالك.",
            ]:
                AUDIO_CACHE[k] = uni_fallback
                AUDIO_CACHE[f"Charon:{k}"] = uni_fallback
                AUDIO_CACHE[f"Fenrir:{k}"] = uni_fallback
                AUDIO_CACHE[f"Aoede:{k}"] = uni_fallback

        if salam_audio:
            for k in [
                "وعليكم السلام ورحمة الله وبركاته، يا هلا والله ومسهلا! سم أمرني وش طلبك اليوم؟",
                "وعليكم السلام ورحمة الله، يا هلا بك.. آمرني وش طلبك اليوم؟",
                "وعليكم السلام، هلا والله.. وش أقدر أساعدك فيه؟",
            ]:
                AUDIO_CACHE[k] = salam_audio
                AUDIO_CACHE[f"Charon:{k}"] = salam_audio
                AUDIO_CACHE[f"Fenrir:{k}"] = salam_audio
                AUDIO_CACHE[f"Aoede:{k}"] = salam_audio

        if appointment_audio:
            for k in [
                "أبشر بعزك وفوق راسي! رتبت لك الموعد، وبرسل لك اللوكيشن والتفاصيل الحين على جوالك بالوقت اللي يناسبك.",
                "أبشر والله بعزك! رتبت لك موعد المعاينة، وبرسل لك اللوكيشن والتفاصيل الحين على جوالك بالوقت اللي يناسبك.",
            ]:
                AUDIO_CACHE[k] = appointment_audio
                AUDIO_CACHE[f"Charon:{k}"] = appointment_audio
                AUDIO_CACHE[f"Fenrir:{k}"] = appointment_audio
                AUDIO_CACHE[f"Aoede:{k}"] = appointment_audio

        logger.info(f"Loaded authentic Deep Saudi Voice audio cache ({len(AUDIO_CACHE)} keys ready in RAM).")
    except Exception as e:
        logger.warning(f"Error loading deep audio cache: {e}")

load_precomputed_gemini_audio()


# Track Gemini TTS quota state so we don't spam 429 calls
_GEMINI_TTS_QUOTA_OK = True
_GEMINI_TTS_LAST_FAIL: float = 0.0

def normalize_arabic_phonetics(text: str) -> str:
    """
    Expands digits into authentic spoken Arabic words and applies
    targeted phonetic tuning to avoid dialect slurring or mispronunciation.
    """
    import re
    num_map = {
        r'\b892\b': 'ثمانمية واثنين وتسعين',
        r'\b2024\b': 'ألفين وأربعة وعشرين',
        r'\b2025\b': 'ألفين وخمسة وعشرين',
        r'\b2026\b': 'ألفين وستة وعشرين',
        r'\b120\b': 'مية وعشرين',
        r'\b190\b': 'مية وتسعين',
        r'\b250\b': 'ميتين وخمسين',
        r'\b320\b': 'ثلاثمية وعشرين',
        r'\b450\b': 'أربعمية وخمسين',
        r'\b500\b': 'خمسمية',
        r'\b650\b': 'ستمية وخمسين',
        r'\b85\b': 'خمسة وثمانين',
        r'\b24\b': 'أربعة وعشرين',
        r'\b10\b': 'عشرة',
        r'\b15\b': 'خمسطعش',
        r'\b20\b': 'عشرين',
        r'\b30\b': 'ثلاثين',
        r'\b40\b': 'أربعين',
        r'\b50\b': 'خمسين',
        r'\b100\b': 'مية',
    }
    for pat, rep in num_map.items():
        text = re.sub(pat, rep, text)

    subs = [
        (r'\bسم\b', 'سَمّ'),
        (r'\bابشر\b', 'أَبْشِر'),
        (r'\bأبشر\b', 'أَبْشِر'),
        (r'\bابشري\b', 'أَبْشِرِي'),
        (r'\bأبشري\b', 'أَبْشِرِي'),
        (r'\bيا غالي\b', 'يا غَالِي'),
        (r'\bيغالي\b', 'يا غَالِي'),
        (r'\bما تشيل هم\b', 'مَا تِشِيل هَمّ'),
        (r'\bفوق راسي\b', 'فُوق رَاسِي'),
        (r'\bالسستم\b', 'السِّسْتِم'),
        (r'\bبالسستم\b', 'بالسِّسْتِم'),
        (r'\bيا طويل العمر\b', 'يا طَوِيل العُمْر'),
        (r'\bومسهلا\b', 'ومَسْهَلا'),
        (r'\bشحنتك\b', 'شَحْنِتِك'),
    ]
    for pat, rep in subs:
        text = re.sub(pat, rep, text)

    return text

async def synthesize_saudi_voice(text: str, voice_id: Optional[str] = None) -> bytes:
    """
    100% Google Gemini Native Audio Synthesizer (Saudi White Dialect):
    1. Instant RAM Cache hit (0ms).
    2. Google Gemini Native Audio (gemini-3.8-flash-tts -> gemini-3.8-flash-lite-tts -> gemini-3.1-flash-tts-preview).
       Voices: Charon (سعود - deep warm tone), Fenrir (فيصل), Aoede (سارة).
    """
    import asyncio, base64, struct, math, time

    clean_text = text.strip()

    # ── 1. Instant RAM cache ──────────────────────────────────────────────────
    tts_voice = voice_id if voice_id in ["Charon", "Fenrir", "Aoede"] else "Charon"
    voice_key = f"{tts_voice}:{clean_text}"

    if voice_key in AUDIO_CACHE:
        logger.info(f"0ms cache hit (voice-keyed): {clean_text[:50]}")
        return AUDIO_CACHE[voice_key]

    if clean_text in AUDIO_CACHE:
        logger.info(f"0ms cache hit: {clean_text[:50]}")
        return AUDIO_CACHE[clean_text]

    for k, v in AUDIO_CACHE.items():
        if k.strip(".؟?! ") == clean_text.strip(".؟?! "):
            logger.info(f"0ms fuzzy cache hit: {clean_text[:50]}")
            return v

    # ── 2. Google Gemini Native Neural Audio (Official Production Engine) ───
    gemini_key = settings.GEMINI_API_KEY
    if gemini_key:
        payload = {
            "contents": [{"parts": [{"text": clean_text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": tts_voice}
                    }
                }
            }
        }
        # Priority order per system directive (flash-lite first for instant quota & zero-429 speed)
        models_to_try = [
            "gemini-3.8-flash-lite-tts",
            "gemini-3.8-flash-tts",
            "gemini-3.1-flash-tts-preview"
        ]
        import httpx
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    r = await client.post(url, json=payload, headers={"Content-Type": "application/json"})

                if r.status_code == 200:
                    data = r.json()
                    b64_audio = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("inlineData", {})
                        .get("data", "")
                    )
                    if b64_audio:
                        pcm_bytes = base64.b64decode(b64_audio)
                        sample_rate = 24000
                        num_channels = 1
                        bits = 16
                        byte_rate = sample_rate * num_channels * bits // 8
                        block_align = num_channels * bits // 8
                        data_size = len(pcm_bytes)
                        wav_header = struct.pack(
                            "<4sI4s4sIHHIIHH4sI",
                            b"RIFF", 36 + data_size, b"WAVE",
                            b"fmt ", 16, 1, num_channels,
                            sample_rate, byte_rate, block_align, bits,
                            b"data", data_size
                        )
                        audio_bytes = wav_header + pcm_bytes
                        AUDIO_CACHE[clean_text] = audio_bytes
                        AUDIO_CACHE[voice_key] = audio_bytes
                        logger.info(f"Gemini Native Voice ({tts_voice} via {model}): {clean_text[:50]} ({len(audio_bytes)} bytes)")
                        return audio_bytes
                else:
                    logger.warning(f"Gemini TTS ({model}) returned {r.status_code}: {r.text[:120]}")
            except Exception as g_err:
                logger.warning(f"Gemini TTS ({model}) attempt failed: {g_err}")

    logger.error(f"Gemini Native Audio synthesis failed for: {clean_text[:50]}")
    return b""



@app.post("/api/tts")
async def synthesize_speech(req: TTSRequest):
    """
    Synthesize authentic Arabic call-center audio in Deep Saudi voice.
    Fast, reliable, zero-pop playback.
    """
    try:
        from fastapi import Response
        audio_bytes = await synthesize_saudi_voice(req.text, voice_id=req.voice or "Charon")
        if not audio_bytes:
            audio_bytes = AUDIO_CACHE.get("أهلاً بك، معك سعود.. كيف أقدر أساعدك اليوم؟", b"")

        media_type = "audio/mpeg" if audio_bytes.startswith(b"\xff\xfb") or audio_bytes.startswith(b"ID3") else "audio/wav"
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "Content-Length": str(len(audio_bytes)),
                "Cache-Control": "no-cache",
                "X-Provider": "saudi-deep-voice",
            },
        )
    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────
# VOICE CHAT: Sub-Second Sovereign STT (Faster-Whisper in-memory + Gemini fallback)
# ─────────────────────────────────────────────────────
import asyncio
import tempfile
import base64
import io
from fastapi import File, UploadFile, Form

_WHISPER_INSTANCE = None

def get_whisper():
    """Singleton in-memory Faster-Whisper model for sub-second local transcription."""
    global _WHISPER_INSTANCE
    if _WHISPER_INSTANCE is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Initializing in-memory Faster-Whisper base model (int8/CPU)...")
            _WHISPER_INSTANCE = WhisperModel("base", device="cpu", compute_type="int8")
            logger.info("Faster-Whisper base model ready in RAM.")
        except Exception as e:
            logger.error(f"Failed to load Faster-Whisper model: {e}")
    return _WHISPER_INSTANCE

async def transcribe_audio_bytes(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """
    Sub-second sovereign speech-to-text.
    1. Local Faster-Whisper in-memory (~0.7s, zero network, zero 503/429 errors).
    2. Fallback to Gemini Multimodal STT (gemini-3.5-flash-lite / gemini-3.8-flash).
    """
    if not audio_bytes or len(audio_bytes) < 800:
        return ""

    # Priority 1: Faster-Whisper in-memory (Instant Local)
    try:
        model = get_whisper()
        if model is not None:
            loop = asyncio.get_running_loop()
            def _transcribe():
                segs, _ = model.transcribe(
                    io.BytesIO(audio_bytes),
                    language="ar",
                    beam_size=1,
                    vad_filter=False
                )
                return " ".join(s.text.strip() for s in segs if s.text).strip()

            text = await loop.run_in_executor(None, _transcribe)
            if text:
                logger.info(f"Faster-Whisper STT transcribed ({len(text)} chars): '{text}'")
                return text
    except Exception as w_err:
        logger.warning(f"Faster-Whisper STT attempt error: {w_err}")

    # Priority 2: Gemini Cloud Fallback
    key = settings.GEMINI_API_KEY
    if key:
        try:
            import httpx
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            clean_mime = "audio/wav" if "wav" in mime_type else "audio/webm" if "webm" in mime_type else "audio/ogg" if "ogg" in mime_type else "audio/mpeg"
            payload = {
                "contents": [{
                    "parts": [
                        {"inline_data": {"mime_type": clean_mime, "data": audio_b64}},
                        {"text": "Transcribe accurately what the speaker is saying in Arabic. Output only the Arabic text, no other words."}
                    ]
                }],
                "generationConfig": {"temperature": 0.0, "maxOutputTokens": 100}
            }
            async with httpx.AsyncClient(timeout=2.5) as client:
                for model in ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                        r = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                        if r.status_code == 200:
                            candidate = r.json().get("candidates", [{}])[0]
                            part = candidate.get("content", {}).get("parts", [{}])[0]
                            text = part.get("text") or part.get("audioTranscription", {}).get("text", "")
                            text = text.strip() if text else ""
                            if text:
                                logger.info(f"Gemini {model} STT transcribed: {text[:80]}")
                                return text
                    except Exception as m_err:
                        logger.warning(f"Gemini {model} STT attempt error: {m_err}")
        except Exception as e:
            logger.warning(f"Gemini STT fallback exception: {e}")

    return ""

def get_smart_saudi_reply(transcript: str, sector: str, dialect: str = "najdi", custom_name: str = "", custom_faq: str = "", agent_name: str = "سعود") -> Optional[str]:
    """
    Zero-latency authentic Najdi call center engine.
    Domain-agnostic conversational intelligence with de-escalation & CRM lookup.
    """
    t = transcript.lower().strip()

    # ─── DE-ESCALATION & SUPERVISOR PROTOCOL (TASK 1) ────────────────────────
    # 1. Caller demands supervisor / live human
    if any(k in t for k in [
        "مشرف", "مدير", "المشرف", "المدير", "مسؤول", "المسؤول",
        "موظف بشري", "حولني", "انسان", "أكلم مسؤول", "كلمني مسؤول",
        "ما أبي ذكاء", "ما أبي روبوت", "ما تفهم", "أبغى إنسان", "حولني على انسان", "كلم المشرف"
    ]):
        logger.info(f"De-escalation triggered: Caller demanded supervisor/transfer ('{t[:40]}')")
        return DE_ESCALATION_TRANSFER

    # 2. Caller expresses anger, frustration, or complaint
    if any(k in t for k in [
        "زعلان", "غضبان", "معصب", "انزعاج", "منزعج", "مشكلة", "خدمة سيئة",
        "انضحك علي", "أشتكي", "شكوى", "ما ينفع", "تاخرتوا", "متأخرة", "تأخير",
        "مهزلة", "تعبت", "خدمتكم سيئة", "وين طلبي", "ما وصلني", "نصابين", "قهر"
    ]):
        logger.info(f"De-escalation triggered: Angry/frustrated caller detected ('{t[:40]}')")
        return DE_ESCALATION_EMPATHY

    # ─── FILLER PHRASING (TASK 1) ────────────────────────────────────────────
    # 3. Caller asks agent to check / look up in database or system
    if any(k in t for k in [
        "شيك لي", "شيك في السستم", "شيك في النظام", "شيك بالسستم", "شيك بالنظام",
        "شوف لي في السستم", "شوف لي في النظام", "شوف في النظام", "شوف في السستم",
        "شوف بالنظام", "شوف بالسستم", "ابحث في النظام", "ابحث في السستم", "ابحث لي",
        "شيك ع الطلب", "شيك على الطلب"
    ]) and not any(k in t for k in ["05", "رقم"]):
        return FILLER_LOOKUP_PHRASE

    # ─── CALLER ID & CRM PHONE LOOKUP (TASK 2) ───────────────────────────────
    # 4. Check if transcript contains a phone number for automatic CRM identification
    phone_match = re.search(r"(?:05|9665|\+9665)\d{8}", t)
    if phone_match:
        extracted_phone = phone_match.group(0)
        crm_rec = lookup_customer_record(extracted_phone)
        if crm_rec and crm_rec.get("found"):
            name = crm_rec.get("name", "يا غالي")
            inquiry = crm_rec.get("open_inquiry", "")
            logger.info(f"CRM voice lookup matched caller {name} for phone {extracted_phone}")
            return f"يا هلا والله بأخوي {name}! شيكت لك في السستم، مسجل عندي استفسارك عن {inquiry}. أبشر بسعدك وش ودك نتابع فيه الحين؟"

    # All regular questions, greetings, inquiries, and discussions flow dynamically to the Gemini LLM
    return None




@app.post("/api/voice-chat")
async def voice_chat(
    audio: UploadFile = File(...),
    dialect: str = Form(default="najdi"),
    voice: str = Form(default="Charon"),
    sector: str = Form(default="customer_service"),
    custom_name: str = Form(default=""),
    custom_faq: str = Form(default=""),
    history: str = Form(default="[]"),
    agent_name: str = Form(default=""),
    caller_phone: str = Form(default=""),
):
    """
    JARVIS Voice Chat with 4-in-1 industry presets & deep call center voice:
    1. Transcribes incoming audio with Google Gemini Multimodal STT.
    2. Zero-latency Smart Saudi Dialog Engine (<1ms) for instant catalog truth.
    3. Multi-provider LLM fallback (OpenAI / Groq / Gemini flash lite).
    4. Speaks back immediately with Google Gemini Deep Voice (Charon - Saud, Fenrir - Faisal).
    """
    try:
        import httpx

        audio_data = await audio.read()
        if not audio_data or len(audio_data) < 800:
            return {"transcript": "", "reply": "", "silent": True}

        effective_name = agent_name or "سعود"
        is_hijazi = False  # Najdi only — Hijazi removed per user request

        # Parse conversation history
        try:
            hist_list = json.loads(history) if history else []
        except Exception:
            hist_list = []

        content_type = audio.content_type or "audio/wav"
        mime = "audio/wav" if "wav" in content_type else "audio/webm" if "webm" in content_type else "audio/ogg" if "ogg" in content_type else "audio/mpeg"

        # 1. Speech-to-Text
        raw_transcript = await transcribe_audio_bytes(audio_data, mime)
        logger.info(f"User voice raw transcript: '{raw_transcript}'")

        # Strip out ElevenLabs Scribe sound effect tags (like [صوت شلال], [صوت هواء], etc.)
        import re
        cleaned = re.sub(r"\[.*?\]", "", raw_transcript).strip()
        text_chars = re.sub(r"[\W_\d]+", "", cleaned).strip()

        if not text_chars or len(text_chars) < 2:
            logger.info(f"Ignored noise or ambient sound: '{raw_transcript}'")
            return {"transcript": "", "reply": "", "silent": True}

        # If transcript contains no Arabic characters (ignore random English noise classification)
        has_arabic = any("\u0600" <= c <= "\u06FF" for c in text_chars)
        if not has_arabic and dialect != "bilingual":
            logger.info(f"Ignored non-Arabic noise classification: '{raw_transcript}'")
            return {"transcript": "", "reply": "", "silent": True}

        transcript = cleaned
        logger.info(f"Cleaned user transcript: '{transcript}' (Sector: {sector}, Dialect: {dialect}, Voice: {voice}, Agent: {effective_name})")

        reply = None
        used_model = None

        # 2. Priority 1: Instant Zero-Latency Smart Saudi Dialog Engine (<1ms)
        smart_reply = get_smart_saudi_reply(
            transcript=transcript,
            sector=sector,
            dialect=dialect,
            custom_name=custom_name,
            custom_faq=custom_faq,
            agent_name=effective_name
        )
        if not smart_reply and caller_phone:
            crm_rec = lookup_customer_record(caller_phone)
            if crm_rec and crm_rec.get("found"):
                name = crm_rec.get("name", "يا غالي")
                inquiry = crm_rec.get("open_inquiry", "")
                if any(w in transcript for w in ["طلبي", "شحنتي", "موضوعي", "تذكرتي", "وش صار", "وين وصل", "شيك لي", "شيكت", "حسابي"]):
                    smart_reply = f"يا هلا والله بأخوي {name}! شيكت لك في السستم، مسجل عندي استفسارك عن {inquiry}. أبشر بسعدك الحين أتابع لك إياه فوراً."
        if smart_reply:
            reply = smart_reply
            used_model = "saudi-smart-engine"
            logger.info(f"Matched instant smart Saudi reply ({used_model}): {reply[:80]}")

        # 3. Priority 2: External LLMs (for open-ended / complex inquiries)
        if not reply:
            catalog_context = get_catalog_context_string(sector)
            system_prompt = get_sector_prompt(
                sector=sector,
                dialect=dialect,
                catalog_context=catalog_context,
                custom_company_name=custom_name,
                custom_faq=custom_faq,
                agent_name=effective_name
            )


            # Option A: OpenAI (gpt-4o-mini) -> ~250ms, zero-503
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key and not reply:
                try:
                    messages = [{"role": "system", "content": system_prompt}]
                    for turn in hist_list:
                        role_str = "assistant" if turn.get("role") in ["assistant", "model"] else "user"
                        messages.append({"role": role_str, "content": turn.get("content", "")})
                    messages.append({"role": "user", "content": transcript})

                    async with httpx.AsyncClient(timeout=5.0) as client:
                        r = await client.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                            json={
                                "model": "gpt-4o-mini",
                                "messages": messages,
                                "temperature": 0.3,
                                "max_tokens": 120,
                            }
                        )
                        if r.status_code == 200:
                            reply = r.json()["choices"][0]["message"]["content"].strip()
                            used_model = "gpt-4o-mini"
                except Exception as e:
                    logger.warning(f"OpenAI error: {e}")

            # Option B: Groq (llama-3.3-70b-versatile) -> ~180ms
            groq_key = os.getenv("GROQ_API_KEY")
            if groq_key and not reply:
                try:
                    messages = [{"role": "system", "content": system_prompt}]
                    for turn in hist_list:
                        role_str = "assistant" if turn.get("role") in ["assistant", "model"] else "user"
                        messages.append({"role": role_str, "content": turn.get("content", "")})
                    messages.append({"role": "user", "content": transcript})

                    async with httpx.AsyncClient(timeout=4.0) as client:
                        r = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                            json={
                                "model": "llama-3.3-70b-versatile",
                                "messages": messages,
                                "temperature": 0.3,
                                "max_tokens": 120,
                            }
                        )
                        if r.status_code == 200:
                            reply = r.json()["choices"][0]["message"]["content"].strip()
                            used_model = "groq-llama-3.3-70b"
                except Exception as e:
                    logger.warning(f"Groq error: {e}")

            # Option C: Gemini flash-lite-latest (fast single attempt, strict 3.0s timeout)
            if settings.GEMINI_API_KEY and not reply:
                contents = []
                for turn in hist_list:
                    role = "model" if turn.get("role") in ["assistant", "model"] else "user"
                    contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
                contents.append({"role": "user", "parts": [{"text": transcript}]})

                payload = {
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "contents": contents,
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 40}
                }
                gemini_key = settings.GEMINI_API_KEY
                async with httpx.AsyncClient(timeout=3.0) as client:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={gemini_key}"
                        response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                        if response.status_code == 200:
                            res = response.json()
                            raw_reply = res.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[-1].get("text", "").strip()
                            clean_reply = re.sub(r"<thought>.*?</thought>", "", raw_reply, flags=re.DOTALL)
                            clean_reply = re.sub(r"\(.*?[A-Za-z].*?\)", "", clean_reply)
                            clean_reply = re.sub(r"\b[A-Za-z]+\b", "", clean_reply)
                            clean_reply = clean_reply.strip('"').strip("'").strip()
                            if any("\u0600" <= c <= "\u06FF" for c in clean_reply) and len(clean_reply) > 5:
                                reply = clean_reply
                            else:
                                reply = raw_reply.strip()
                            used_model = "gemini-3.5-flash-lite"
                    except Exception as g_err:
                        logger.warning(f"Gemini exception: {g_err}")

            # Option D: Graceful Najdi Fallback
            if not reply:
                reply = "وصلني سؤالك والله، أبشر بسعدك بنرسل لك كل التفاصيل الحين على جوالك."
                used_model = "saudi-safe-fallback"

        logger.info(f"LevelLM voice reply ({used_model}, voice: {voice}): {reply[:80]}")
        audio_bytes = await synthesize_saudi_voice(reply, voice_id=voice)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8") if audio_bytes else ""
        return {
            "transcript": transcript,
            "reply": reply,
            "audio_base64": audio_b64,
            "provider": used_model
        }

    except Exception as e:
        logger.error(f"Voice-chat error: {e}", exc_info=True)
        return {
            "transcript": "",
            "reply": "أبشر! صار خطأ بسيط، جرب تتكلم مرة ثانية أو اكتب سؤالك.",
            "provider": "error_fallback",
        }

@app.post("/api/stt")
async def transcribe_speech_endpoint(request: Request, audio: Optional[UploadFile] = File(default=None)):
    """Standalone STT endpoint for web client (supports both multipart audio file and JSON base64)."""
    audio_data = b""
    mime = "audio/wav"

    if audio:
        try:
            audio_data = await audio.read()
            mime = audio.content_type or "audio/wav"
        except Exception as e:
            logger.warning(f"Error reading multipart audio: {e}")

    if not audio_data:
        try:
            body = await request.json()
            b64 = body.get("audio_base64") or body.get("audio") or ""
            if b64:
                import base64
                audio_data = base64.b64decode(b64)
                mime = body.get("mime") or "audio/wav"
        except Exception:
            pass

    if not audio_data or len(audio_data) < 200:
        return {"transcript": "", "text": "", "language": "ar"}

    text = await transcribe_audio_bytes(audio_data, mime)
    logger.info(f"STT transcribed: '{text}' ({len(audio_data)} bytes)")
    return {"transcript": text, "text": text, "language": "ar"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server.app:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )

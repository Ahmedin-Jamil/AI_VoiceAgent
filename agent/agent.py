"""
Sovereign Voice AI Call Center Agent (Saudi Arabia B2B SaaS).
Built on LiveKit Agents SDK with local Whisper STT, Llama/ALLAM LLM, and Saudi Arabic TTS.
Universal Domain-Agnostic Core with Caller ID and CRM Customer Lookup.
"""

import sys
import json
import logging
from typing import Optional

# Ensure UTF-8 output encoding for Arabic console logs on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import os
# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import silero

from config import settings
from agent.prompts import (
    get_system_prompt,
    get_initial_greeting,
    build_universal_prompt,
)
from agent.stt_service import create_stt_engine
from agent.tts_service import create_tts_engine
from agent.llm_service import create_llm_engine
from agent.rag_service import get_voice_tools, lookup_customer_record, normalize_phone_number

# Configure rich logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sovereign_voice_ai.agent")

def prewarm(proc: JobProcess):
    """Prewarm local models (VAD, Silero) in memory before jobs arrive."""
    logger.info("Prewarming Silero VAD model in memory...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("Prewarm completed successfully.")

async def entrypoint(ctx: JobContext):
    """
    Main call entrypoint triggered whenever an inbound WebRTC or SIP call connects.
    Inspects Caller ID and CRM records, then constructs the Universal Agent session.
    """
    logger.info(f"🎙️ Inbound call received in room: {ctx.room.name}")

    # Connect to audio streams from the caller
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Retrieve prewarmed VAD or load fresh
    vad_instance = ctx.proc.userdata.get("vad") or silero.VAD.load()

    # Initialize sovereign pipeline components
    stt_instance = create_stt_engine()
    tts_instance = create_tts_engine()
    llm_instance = create_llm_engine()
    tools_list = get_voice_tools()

    # ─────────────────────────────────────────────────────────────
    # Caller ID & Customer CRM Lookup from Room/Participant Metadata
    # ─────────────────────────────────────────────────────────────
    caller_phone = None
    caller_crm_info = ""
    greeting_message = get_initial_greeting(settings.DEFAULT_DIALECT)

    try:
        raw_meta = ctx.room.metadata if ctx.room else None
        if raw_meta:
            meta = json.loads(raw_meta) if isinstance(raw_meta, str) else raw_meta
            caller_phone = meta.get("caller_phone") or meta.get("phone") or meta.get("caller_id")
    except Exception as e:
        logger.debug(f"Could not parse room metadata for phone: {e}")

    # Fallback: check room name for phone number pattern (e.g., call_0501234567)
    if not caller_phone and ctx.room and ctx.room.name:
        import re
        match = re.search(r"(?:05|9665|\+9665)\d{8}", ctx.room.name)
        if match:
            caller_phone = match.group(0)

    if caller_phone:
        logger.info(f"📞 Inbound Caller ID identified: {caller_phone}")
        cust = lookup_customer_record(caller_phone)
        if cust and cust.get("found"):
            cust_name = cust.get("name", "العميل")
            cust_inquiry = cust.get("open_inquiry", "")
            caller_crm_info = (
                f"- رقم الجوال: {caller_phone}\n"
                f"- اسم العميل المسجل: {cust_name}\n"
                f"- الطلب/الاستفسار المفتوح في الـ CRM: {cust_inquiry}\n"
                f"- الحالة: {cust.get('status', 'عميل مسجل')} | التذاكر المفتوحة: {cust.get('open_tickets', 0)}"
            )
            logger.info(f"✅ CRM record matched: {cust_name} - {cust_inquiry}")
            # Personalized warm Saudi greeting with caller recognition
            greeting_message = f"يا هلا والله بأخوي {cust_name}! معك سعود من خدمة العملاء، كيف أقدر أخدمك اليوم؟"

    # Construct the universal conversational agent with dynamic context
    system_instruction = build_universal_prompt(
        company_name="المنشأة",
        agent_name="سعود",
        caller_crm_context=caller_crm_info,
    )
    agent = Agent(
        instructions=system_instruction,
        tools=tools_list,
    )

    # Construct the real-time voice session
    # allow_interruptions=True ensures instant caller barge-in
    session = AgentSession(
        vad=vad_instance,
        stt=stt_instance,
        llm=llm_instance,
        tts=tts_instance,
        allow_interruptions=True,
        min_endpointing_delay=0.35,  # Fast turn-taking for snappy Arabic conversation
        max_endpointing_delay=1.2,
    )

    # Telemetry and state hooks
    @session.on("agent_state_changed")
    def on_agent_state(state):
        logger.info(f"Agent state changed -> {state}")

    @session.on("user_input_transcribed")
    def on_user_speech(ev):
        logger.info(f"🗣️ Caller ({ev.language}): {ev.transcript}")

    # Start conversational loop inside the connected room
    await session.start(agent, room=ctx.room)

    # Deliver immediate warm Saudi Arabic greeting
    logger.info(f"🤖 Agent Greeting: {greeting_message}")
    await session.say(greeting_message)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            ws_url=settings.LIVEKIT_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
    )

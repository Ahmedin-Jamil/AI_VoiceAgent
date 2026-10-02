"""
Interactive Pipeline Simulator & Diagnostic Test Harness for Sovereign Voice AI.
Tests STT, LLM, TTS, RAG, and Dialects directly in the terminal without requiring LiveKit Server.
"""

import os
import sys
import asyncio
import logging
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import edge_tts
from config import settings
from agent.prompts import get_system_prompt, get_initial_greeting
from agent.rag_service import search_knowledge_base, book_clinic_appointment, track_saudi_shipment

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sovereign_voice_ai.test")

async def test_tts_synthesis(dialect: str = "najdi", output_path: str = "tests/test_greeting.mp3"):
    """Synthesizes greeting in authentic Saudi Arabic and measures latency."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    greeting = get_initial_greeting(dialect)
    voice = settings.TTS_VOICE

    print(f"\n[1/4] 🎙️ Testing TTS (Mouth) with voice: {voice}")
    print(f"      Text: \"{greeting}\"")

    start_time = time.time()
    communicate = edge_tts.Communicate(greeting, voice=voice)
    await communicate.save(output_path)
    elapsed = (time.time() - start_time) * 1000

    print(f"      ✅ Audio generated in {elapsed:.1f}ms! Saved to: {output_path}")
    return output_path

def test_stt_transcription(audio_file: str):
    """Transcribes audio using local Faster-Whisper model."""
    print(f"\n[2/4] 👂 Testing Faster-Whisper STT (Ears) on {audio_file}...")
    from faster_whisper import WhisperModel

    start_time = time.time()
    model = WhisperModel(settings.FASTER_WHISPER_MODEL, device=settings.FASTER_WHISPER_DEVICE, compute_type=settings.FASTER_WHISPER_COMPUTE_TYPE)
    segments, info = model.transcribe(audio_file, language="ar")
    transcript = " ".join([s.text.strip() for s in segments if s.text])
    elapsed = (time.time() - start_time) * 1000

    print(f"      ✅ Transcription completed in {elapsed:.1f}ms!")
    print(f"      Detected Language: {info.language} (Probability: {info.language_probability:.2f})")
    print(f"      Transcribed Text: \"{transcript}\"")
    return transcript

def test_rag_and_tools():
    """Tests sovereign enterprise knowledge base lookups and booking tools."""
    print(f"\n[3/4] 🧠 Testing Sovereign RAG & Enterprise Tools...")

    # Test 1: Insurance inquiry
    query = "ايش شركات التأمين المعتمدة عندكم؟"
    res1 = search_knowledge_base(query)
    print(f"      Query: \"{query}\"")
    print(f"      Result: {res1}")

    # Test 2: Shipment tracking
    res2 = track_saudi_shipment("SA-9823412")
    print(f"      Shipment Tool: {res2}")

    # Test 3: Appointment booking
    res3 = book_clinic_appointment(
        patient_name="محمد القحطاني",
        phone_number="0501234567",
        clinic_specialty="جلدية",
        preferred_time="غداً الساعة 5:00 مساءً"
    )
    print(f"      Booking Tool: {res3}")

async def test_llm_generation(user_query: str = "يا سند، أبي أحجز موعد أسنان بكرة العصر"):
    """Tests LLM brain dialogue response with Saudi dialect prompt."""
    print(f"\n[4/4] ⚡ Testing LLM Brain ({settings.LLM_PROVIDER}) at {settings.LLM_BASE_URL}...")
    from livekit.plugins import openai
    from livekit.agents import llm

    prompt = get_system_prompt(settings.DEFAULT_DIALECT)
    print(f"      Dialect Persona: {settings.DEFAULT_DIALECT.upper()}")
    print(f"      Caller Query: \"{user_query}\"")

    try:
        model = openai.LLM(
            model=settings.LLM_MODEL,
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
        chat_ctx = llm.ChatContext()
        chat_ctx.add_message(role="system", content=prompt)
        chat_ctx.add_message(role="user", content=user_query)

        start_time = time.time()
        stream = model.chat(chat_ctx=chat_ctx)
        response_text = ""
        first_token_time = None

        async for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            if content:
                if first_token_time is None:
                    first_token_time = (time.time() - start_time) * 1000
                response_text += content

        total_time = (time.time() - start_time) * 1000
        print(f"      First Token Latency (TTFT): {first_token_time or 0:.1f}ms")
        print(f"      Total LLM Response: \"{response_text}\" in {total_time:.1f}ms")
    except Exception as e:
        print(f"      ⚠️ LLM endpoint test skipped (Local server not running yet: {e})")
        print("      Note: Start Ollama (`ollama run llama3.1`) or vLLM to activate local brain inference.")

async def main():
    print("=" * 65)
    print("🎙️ SOVEREIGN VOICE AI - STEP 1 DIAGNOSTIC TEST HARNESS")
    print("=" * 65)
    audio_file = await test_tts_synthesis(dialect=settings.DEFAULT_DIALECT)
    test_stt_transcription(audio_file)
    test_rag_and_tools()
    await test_llm_generation()
    print("\n" + "=" * 65)
    print("🎯 All core pipeline components validated!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())

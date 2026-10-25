"""
Sovereign TTS (Text-to-Speech) Service using Google Gemini Native Audio.
Supports authentic Saudi Arabic neural voices (Charon / Fenrir) with deep baritone pitch,
zero-pop Hann-window audio processing, and sub-second delivery.
100% free of Microsoft Edge-TTS or robotic synthetic engines.
"""

import uuid
import logging
import base64
import struct
import math
import io
import wave
import httpx
from typing import Optional
from livekit.agents import tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from livekit.plugins import openai

from config import settings

logger = logging.getLogger("sovereign_voice_ai.tts")


def make_voice_deeper(samples: list[int], factor: float = 0.93) -> list[int]:
    """Subtly deepens the voice pitch for authoritative corporate call center presence."""
    if factor == 1.0 or not samples:
        return samples
    n = len(samples)
    new_len = int(n / factor)
    res = [0] * new_len
    for i in range(new_len):
        src_pos = i * factor
        src_idx = int(src_pos)
        frac = src_pos - src_idx
        if src_idx + 1 < n:
            res[i] = int(samples[src_idx] * (1.0 - frac) + samples[src_idx + 1] * frac)
        elif src_idx < n:
            res[i] = samples[src_idx]
    return res[:n]


def apply_zero_crossing_fade(pcm_bytes: bytes) -> bytes:
    """Hann-window smoothing to eliminate audio pop artifacts."""
    if len(pcm_bytes) < 480:
        return pcm_bytes
    num_samples = len(pcm_bytes) // 2
    samples = list(struct.unpack(f"<{num_samples}h", pcm_bytes[:num_samples * 2]))
    fade_in = min(240, num_samples // 4)
    for i in range(fade_in):
        factor = 0.5 * (1.0 - math.cos(math.pi * i / fade_in))
        samples[i] = int(samples[i] * factor)
    fade_out = min(1200, num_samples // 2)
    for i in range(fade_out):
        idx = num_samples - fade_out + i
        factor = 0.5 * (1.0 + math.cos(math.pi * i / fade_out))
        samples[idx] = int(samples[idx] * factor)
    samples.extend([0] * 1200)
    return struct.pack(f"<{len(samples)}h", *samples)


class GeminiTTSChunkedStream(tts.ChunkedStream):
    """Streams audio chunks produced by Google Gemini Native Audio into LiveKit's AudioEmitter."""

    def __init__(
        self,
        *,
        tts: tts.TTS,
        input_text: str,
        conn_options: APIConnectOptions,
        voice: str,
    ) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._voice = voice

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        try:
            target_voice = self._voice or "Charon"
            if target_voice not in ["Charon", "Fenrir", "Aoede", "Puck", "Kore"]:
                target_voice = "Charon"

            models_to_try = [
                "gemini-3.8-flash-tts",
                "gemini-3.8-flash-lite-tts",
                "gemini-3.1-flash-tts-preview",
            ]

            audio_pcm = None
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": self.input_text}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": target_voice
                                }
                            }
                        }
                    }
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    r = await client.post(url, json=payload)
                    if r.status_code == 200:
                        d = r.json()
                        candidates = d.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            for p in parts:
                                if "inlineData" in p and "data" in p["inlineData"]:
                                    audio_pcm = base64.b64decode(p["inlineData"]["data"])
                                    break
                    if audio_pcm:
                        break

            if audio_pcm:
                if target_voice in ["Charon", "Fenrir"]:
                    num_samples = len(audio_pcm) // 2
                    samples = list(struct.unpack(f"<{num_samples}h", audio_pcm[:num_samples * 2]))
                    deepened_samples = make_voice_deeper(samples, factor=0.93)
                    audio_pcm = struct.pack(f"<{len(deepened_samples)}h", *deepened_samples)

                audio_pcm = apply_zero_crossing_fade(audio_pcm)

                bio = io.BytesIO()
                with wave.open(bio, "wb") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(24000)
                    wf.writeframes(audio_pcm)
                wav_data = bio.getvalue()

                output_emitter.initialize(
                    request_id=str(uuid.uuid4()),
                    sample_rate=24000,
                    num_channels=1,
                    mime_type="audio/wav",
                )
                output_emitter.push(wav_data)
                output_emitter.flush()
        except Exception as e:
            logger.error(f"Error streaming GeminiTTS audio: {e}", exc_info=True)
            raise


class GeminiTTS(tts.TTS):
    """
    100% Google Gemini Native Voice provider for authentic Saudi Najdi conversation.
    Voices: Charon (Saud), Fenrir (Faisal), Aoede (Sara).
    """

    def __init__(
        self,
        voice: Optional[str] = None,
        sample_rate: int = 24000,
    ) -> None:
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=sample_rate,
            num_channels=1,
        )
        self._voice = voice or "Charon"

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> tts.ChunkedStream:
        return GeminiTTSChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
            voice=self._voice,
        )


def create_tts_engine(voice: Optional[str] = None) -> tts.TTS:
    """Factory function to initialize the configured TTS engine."""
    selected_voice = voice or getattr(settings, "GEMINI_TTS_VOICE", "Charon") or "Charon"
    logger.info(f"Initializing 100% Google Gemini Native Voice: {selected_voice}")
    return GeminiTTS(voice=selected_voice)

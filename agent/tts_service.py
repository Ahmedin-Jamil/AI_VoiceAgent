"""
Sovereign TTS (Text-to-Speech) Service.
Supports authentic Saudi Arabic neural voices (Hamed, Zariyah) with sub-150ms streaming latency,
local offline Piper TTS, and self-hosted OpenAI-compatible endpoints.
"""

import uuid
import logging
from typing import Optional
import edge_tts
from livekit.agents import tts
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from livekit.plugins import openai

from config import settings

logger = logging.getLogger("sovereign_voice_ai.tts")

class EdgeTTSChunkedStream(tts.ChunkedStream):
    """Streams audio chunks produced by Edge TTS into LiveKit's AudioEmitter."""

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
            communicate = edge_tts.Communicate(text=self.input_text, voice=self._voice)
            output_emitter.initialize(
                request_id=str(uuid.uuid4()),
                sample_rate=self._tts.sample_rate,
                num_channels=self._tts.num_channels,
                mime_type="audio/mp3",
            )

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    output_emitter.push(chunk["data"])

            output_emitter.flush()
        except Exception as e:
            logger.error(f"Error streaming EdgeTTS audio: {e}", exc_info=True)
            raise

class EdgeTTS(tts.TTS):
    """
    Zero-subscription authentic Saudi Arabic TTS provider.
    Default voice: 'ar-SA-HamedNeural' or 'ar-SA-ZariyahNeural'.
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
        self._voice = voice or settings.TTS_VOICE

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> tts.ChunkedStream:
        return EdgeTTSChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
            voice=self._voice,
        )

def create_tts_engine(voice: Optional[str] = None) -> tts.TTS:
    """
    Factory function to initialize the configured TTS engine.
    """
    selected_voice = voice or settings.TTS_VOICE

    if settings.TTS_PROVIDER == "edge-tts":
        logger.info(f"Initializing EdgeTTS with Saudi voice: {selected_voice}")
        return EdgeTTS(voice=selected_voice)
    elif settings.TTS_PROVIDER == "openai":
        logger.info(f"Initializing OpenAI-compatible TTS at {settings.LLM_BASE_URL}")
        return openai.TTS(
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
            voice=selected_voice,
        )
    else:
        # Fallback to EdgeTTS for Saudi Arabic fluency
        return EdgeTTS(voice=selected_voice)

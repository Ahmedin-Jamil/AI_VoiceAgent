"""
Sovereign STT (Speech-to-Text) Service using Faster-Whisper.
Sub-300ms transcription latency on local CPU/GPU with Zero per-minute API fees.
"""

import io
import asyncio
import logging
from typing import Optional, List
from livekit import rtc
from livekit.agents import stt, vad, utils
from livekit.agents.types import NOT_GIVEN, NotGivenOr, APIConnectOptions, DEFAULT_API_CONNECT_OPTIONS
from livekit.plugins import silero, openai
from faster_whisper import WhisperModel

from config import settings

logger = logging.getLogger("sovereign_voice_ai.stt")

class FasterWhisperSTT(stt.STT):
    """Local, sovereign Speech-to-Text using Faster-Whisper (CTranslate2)."""

    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
        language: str = "ar",
    ) -> None:
        super().__init__(
            capabilities=stt.STTCapabilities(
                streaming=False,
                interim_results=False,
                offline_recognize=True,
            )
        )
        self._model_size = model_size or settings.FASTER_WHISPER_MODEL
        self._device = device or settings.FASTER_WHISPER_DEVICE
        self._compute_type = compute_type or settings.FASTER_WHISPER_COMPUTE_TYPE
        self._language = language or settings.STT_LANGUAGE
        self._model: Optional[WhisperModel] = None

    def _ensure_model_loaded(self) -> WhisperModel:
        if self._model is None:
            logger.info(
                f"Loading local Faster-Whisper model '{self._model_size}' "
                f"on {self._device} ({self._compute_type})..."
            )
            self._model = WhisperModel(
                self._model_size,
                device=self._device,
                compute_type=self._compute_type,
            )
            logger.info("Faster-Whisper model loaded successfully.")
        return self._model

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: NotGivenOr[str | List[str]] = NOT_GIVEN,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> stt.SpeechEvent:
        """Run non-streaming transcription on the incoming audio buffer."""
        # Convert audio frames to WAV in memory
        combined = rtc.combine_audio_frames(buffer)
        wav_bytes = combined.to_wav_bytes()

        # Run Faster-Whisper inference in threadpool so asyncio event loop stays non-blocking
        loop = asyncio.get_running_loop()
        model = self._ensure_model_loaded()

        target_lang = self._language
        if language is not NOT_GIVEN and isinstance(language, str):
            target_lang = language

        def _transcribe() -> str:
            segments, _ = model.transcribe(
                io.BytesIO(wav_bytes),
                language=target_lang if target_lang != "auto" else None,
                beam_size=1, # Fast greedy search for telephony speed
                vad_filter=False, # VAD already done by Silero
            )
            return " ".join(s.text.strip() for s in segments if s.text)

        text = await loop.run_in_executor(None, _transcribe)

        speech_data = stt.SpeechData(
            text=text,
            language=target_lang,
        )

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[speech_data],
        )

def create_stt_engine() -> stt.STT:
    """
    Factory function to initialize the configured STT engine.
    Wraps FasterWhisperSTT in StreamAdapter with Silero VAD for real-time speech stream handling.
    """
    if settings.STT_PROVIDER == "faster-whisper":
        base_stt = FasterWhisperSTT()
        # Wrap into LiveKit StreamAdapter to handle chunking and silence detection
        vad_instance = silero.VAD.load()
        return stt.StreamAdapter(stt=base_stt, vad=vad_instance)
    else:
        logger.info(f"Using OpenAI-compatible STT at {settings.LLM_BASE_URL}")
        return openai.STT(
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
            language=settings.STT_LANGUAGE,
        )

import os
from typing import Literal
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # LiveKit Server Settings (Self-hosted Sovereign default)
    LIVEKIT_URL: str = Field(default=os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880"))
    LIVEKIT_API_KEY: str = Field(default=os.getenv("LIVEKIT_API_KEY", "devkey"))
    LIVEKIT_API_SECRET: str = Field(default=os.getenv("LIVEKIT_API_SECRET", "secret"))

    # STT Settings (Speech-to-Text)
    STT_PROVIDER: Literal["faster-whisper", "openai"] = Field(
        default=os.getenv("STT_PROVIDER", "faster-whisper") # type: ignore
    )
    FASTER_WHISPER_MODEL: str = Field(default=os.getenv("FASTER_WHISPER_MODEL", "base"))
    FASTER_WHISPER_DEVICE: str = Field(default=os.getenv("FASTER_WHISPER_DEVICE", "cpu"))
    FASTER_WHISPER_COMPUTE_TYPE: str = Field(default=os.getenv("FASTER_WHISPER_COMPUTE_TYPE", "int8"))
    STT_LANGUAGE: str = Field(default=os.getenv("STT_LANGUAGE", "ar"))

    # LLM Settings (Dialogue Manager)
    LLM_PROVIDER: Literal["ollama", "vllm", "openai", "allam", "hf_endpoint", "gemini"] = Field(
        default=os.getenv("LLM_PROVIDER", "ollama") # type: ignore
    )
    LLM_BASE_URL: str = Field(default=os.getenv("LLM_BASE_URL", "http://127.0.0.1:11434/v1"))
    LLM_MODEL: str = Field(default=os.getenv("LLM_MODEL", "qwen2.5:7b"))
    LLM_API_KEY: str = Field(default=os.getenv("LLM_API_KEY", "ollama"))
    LLM_TEMPERATURE: float = Field(default=float(os.getenv("LLM_TEMPERATURE", "0.4")))
    GEMINI_API_KEY: str = Field(default=os.getenv("GEMINI_API_KEY", ""))

    # ALLAM — Arabic Large Language Model (SDAIA / HUMAIN) via HF Dedicated Endpoint
    # Free option: ollama pull allam (local) | ollama pull qwen2.5:7b (also great for Arabic)
    # Paid option: deploy at https://ui.endpoints.huggingface.co/ (~$0.06/hr)
    ALLAM_HF_API_KEY: str = Field(default=os.getenv("ALLAM_HF_API_KEY", ""))
    ALLAM_HF_ENDPOINT_URL: str = Field(default=os.getenv("ALLAM_HF_ENDPOINT_URL", ""))



    # TTS Settings (Text-to-Speech)
    TTS_PROVIDER: Literal["edge-tts", "piper", "openai"] = Field(
        default=os.getenv("TTS_PROVIDER", "edge-tts") # type: ignore
    )
    # Authentic Saudi Arabic voices:
    # "ar-SA-HamedNeural" (Male, Riyadh/Saudi authentic)
    # "ar-SA-ZariyahNeural" (Female, Riyadh/Saudi authentic)
    TTS_VOICE: str = Field(default=os.getenv("TTS_VOICE", "ar-SA-HamedNeural"))

    # Dialect and Persona defaults
    DEFAULT_DIALECT: Literal["najdi", "hijazi", "fusha", "bilingual"] = Field(
        default=os.getenv("DEFAULT_DIALECT", "najdi") # type: ignore
    )

    # Telemetry and Backend API
    API_HOST: str = Field(default=os.getenv("API_HOST", "0.0.0.0"))
    API_PORT: int = Field(default=int(os.getenv("API_PORT", "8000")))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

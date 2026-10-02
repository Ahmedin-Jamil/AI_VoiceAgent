"""
Sovereign LLM Dialogue Service.
Supports self-hosted local models (Llama 3.1 8B, ALLAM, Qwen 2.5) via Ollama or vLLM,
with fallback to OpenAI-compatible sovereign inference APIs.
"""

import logging
from typing import Optional
from livekit.agents import llm
from livekit.plugins import openai

from config import settings

logger = logging.getLogger("sovereign_voice_ai.llm")

def create_llm_engine(
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: Optional[float] = None,
) -> llm.LLM:
    """
    Factory function to initialize the LLM engine for dialogue management.
    Connects to local zero-subscription Ollama/vLLM or external OpenAI-compatible endpoint.
    """
    selected_model = model or settings.LLM_MODEL
    selected_base_url = base_url or settings.LLM_BASE_URL
    selected_temp = temperature if temperature is not None else settings.LLM_TEMPERATURE

    logger.info(
        f"Initializing LLM engine [{settings.LLM_PROVIDER}] "
        f"model='{selected_model}' at '{selected_base_url}' (temp={selected_temp})"
    )

    if settings.LLM_PROVIDER in ("ollama", "vllm"):
        return openai.LLM(
            model=selected_model,
            base_url=selected_base_url,
            api_key=settings.LLM_API_KEY or "local",
            temperature=selected_temp,
        )
    else:
        # Standard OpenAI-compatible API
        return openai.LLM(
            model=selected_model,
            base_url=selected_base_url if selected_base_url else None,
            api_key=settings.LLM_API_KEY,
            temperature=selected_temp,
        )

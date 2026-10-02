"""
Sovereign LLM Dialogue Service.

Priority order of LLM backends:
  1. ALLAM (Arabic LLM by SDAIA × IBM) via Hugging Face Inference API — best Arabic quality
  2. Self-hosted Ollama / vLLM (Llama 3.1 8B, Qwen 2.5) — zero-cost, on-premise
  3. OpenAI-compatible fallback (GPT-4o, etc.)

Set in .env:
  LLM_PROVIDER=allam           → ALLAM via HF Inference API
  LLM_PROVIDER=ollama          → local Ollama
  LLM_PROVIDER=vllm            → local vLLM
  ALLAM_HF_API_KEY=hf_xxxxx    → Hugging Face token (required for ALLAM)
"""

import logging
from typing import Optional
from livekit.agents import llm
from livekit.plugins import openai as openai_plugin

from config import settings

logger = logging.getLogger("sovereign_voice_ai.llm")

# ALLAM model on Hugging Face Inference API
# Repository: https://huggingface.co/inceptionai/jais-13b (open ALLAM family)
# The official SDAIA ALLAM model requires invitation — fallback to jais-13b open version
ALLAM_HF_BASE_URL = "https://api-inference.huggingface.co/models/inceptionai/jais-13b/v1"
ALLAM_MODEL_ID = "inceptionai/jais-13b"


def create_llm_engine(
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: Optional[float] = None,
    provider: Optional[str] = None,
) -> llm.LLM:
    """
    Factory function to initialize the LLM engine for dialogue management.

    If LLM_PROVIDER=allam and ALLAM_HF_API_KEY is set, connects to ALLAM via
    Hugging Face Inference API for best Arabic dialect quality.
    Otherwise connects to local Ollama/vLLM or standard OpenAI endpoint.
    """
    selected_model = model or settings.LLM_MODEL
    selected_base_url = base_url or settings.LLM_BASE_URL
    selected_temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
    selected_provider = provider or settings.LLM_PROVIDER

    # ── ALLAM via Hugging Face Inference API ──────────────────────────────
    if selected_provider == "allam":
        hf_key = getattr(settings, "ALLAM_HF_API_KEY", None) or settings.LLM_API_KEY
        if not hf_key:
            raise ValueError(
                "ALLAM_HF_API_KEY is required for LLM_PROVIDER=allam. "
                "Get your key at https://huggingface.co/settings/tokens"
            )
        allam_url = selected_base_url if selected_base_url else ALLAM_HF_BASE_URL
        logger.info(
            f"Initializing ALLAM engine (Arabic LLM) "
            f"model='{ALLAM_MODEL_ID}' via HF Inference API"
        )
        return openai_plugin.LLM(
            model=ALLAM_MODEL_ID,
            base_url=allam_url,
            api_key=hf_key,
            temperature=selected_temp,
        )

    # ── Self-hosted: Ollama / vLLM ────────────────────────────────────────
    if selected_provider in ("ollama", "vllm"):
        logger.info(
            f"Initializing local LLM [{selected_provider}] "
            f"model='{selected_model}' at '{selected_base_url}' (temp={selected_temp})"
        )
        return openai_plugin.LLM(
            model=selected_model,
            base_url=selected_base_url,
            api_key=settings.LLM_API_KEY or "local",
            temperature=selected_temp,
        )

    # ── Standard OpenAI-compatible API ────────────────────────────────────
    logger.info(
        f"Initializing OpenAI-compatible LLM "
        f"model='{selected_model}' at '{selected_base_url}' (temp={selected_temp})"
    )
    return openai_plugin.LLM(
        model=selected_model,
        base_url=selected_base_url if selected_base_url else None,
        api_key=settings.LLM_API_KEY,
        temperature=selected_temp,
    )

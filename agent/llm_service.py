"""
Sovereign LLM Dialogue Service.

Priority order of LLM backends:
  1. ALLAM via Ollama (local, FREE, best for demo) — download once, run forever
  2. ALLAM via HF Dedicated Endpoint (paid, ~$0.06/hr) — if you deploy one
  3. Self-hosted Ollama / vLLM with Qwen2.5 or Llama 3.1 — good fallback
  4. OpenAI-compatible API (cloud, paid)

───── ALLAM ACCESS REALITY (Oct 2026) ─────────────────────────────────────────
  Official model: humain-ai/ALLaM-7B-Instruct-preview (HuggingFace)
  ❌ HF Serverless Inference API → NOT supported (model too large for free tier)
  ✅ BEST FREE OPTION: Ollama local → `ollama pull allam` (uses your RTX 3050)
  ✅ PAID CLOUD: IBM watsonx.ai, Microsoft Azure AI Model Catalog, DEEM Cloud (KSA Gov)
  ✅ DEMO STAND-IN: Qwen2.5:7b (excellent Arabic, runs locally free)

Set in .env:
  # Best for demo (free, local, great Arabic):
  LLM_PROVIDER=ollama
  LLM_MODEL=qwen2.5:7b          ← install: ollama pull qwen2.5:7b

  # ALLAM via local Ollama (best Saudi Arabic, when available in Ollama):
  LLM_PROVIDER=ollama
  LLM_MODEL=allam               ← install: ollama pull allam

  # HF Dedicated Endpoint (paid - you deploy the model yourself):
  LLM_PROVIDER=hf_endpoint
  ALLAM_HF_ENDPOINT_URL=https://xxxxxxxx.us-east-1.aws.endpoints.huggingface.cloud
  ALLAM_HF_API_KEY=hf_xxxxxxxxxxxx
"""

import os
import logging
from typing import Optional
from livekit.agents import llm
from livekit.plugins import openai as openai_plugin

from config import settings

logger = logging.getLogger("sovereign_voice_ai.llm")

# Official ALLAM model on HuggingFace (SDAIA / HUMAIN)
ALLAM_HF_MODEL_ID = "humain-ai/ALLaM-7B-Instruct-preview"
# NOTE: Free Serverless API does NOT support this model. Use Ollama locally.

# Qwen 2.5 — excellent Arabic quality, runs free on local Ollama
# Great ALLAM stand-in for demos: ollama pull qwen2.5:7b
QWEN_MODEL_ID = "qwen2.5:7b"


def create_llm_engine(
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: Optional[float] = None,
    provider: Optional[str] = None,
) -> llm.LLM:
    """
    Factory function to initialize the LLM engine for dialogue management.

    Routing:
    - hf_endpoint → your own deployed HuggingFace Dedicated Endpoint (ALLAM or other)
    - ollama / vllm → local self-hosted inference (free, sovereign)
    - openai → standard OpenAI-compatible cloud API
    """
    selected_model = model or settings.LLM_MODEL
    selected_base_url = base_url or settings.LLM_BASE_URL
    selected_temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
    selected_provider = provider or settings.LLM_PROVIDER

    # ── HuggingFace Dedicated Endpoint ───────────────────────────────────
    # Deploy your own ALLAM endpoint at: https://ui.endpoints.huggingface.co/
    # Cost: ~$0.06/hr on a single GPU. Supports OpenAI-compatible API.
    if selected_provider == "hf_endpoint":
        hf_key = getattr(settings, "ALLAM_HF_API_KEY", "") or settings.LLM_API_KEY
        endpoint_url = getattr(settings, "ALLAM_HF_ENDPOINT_URL", "") or selected_base_url
        if not hf_key or not endpoint_url:
            raise ValueError(
                "For LLM_PROVIDER=hf_endpoint you need:\n"
                "  ALLAM_HF_API_KEY=hf_xxxxx  (from huggingface.co/settings/tokens)\n"
                "  ALLAM_HF_ENDPOINT_URL=https://xxxx.endpoints.huggingface.cloud\n"
                "Deploy your endpoint at: https://ui.endpoints.huggingface.co/"
            )
        # HF Dedicated Endpoints expose an OpenAI-compatible /v1 API
        api_url = endpoint_url.rstrip("/") + "/v1"
        logger.info(f"Initializing HF Dedicated Endpoint: {api_url}")
        return openai_plugin.LLM(
            model=ALLAM_HF_MODEL_ID,
            base_url=api_url,
            api_key=hf_key,
            temperature=selected_temp,
        )

    # ── Legacy 'allam' provider → redirect to hf_endpoint ────────────────
    if selected_provider == "allam":
        logger.warning(
            "LLM_PROVIDER=allam is deprecated. "
            "Use LLM_PROVIDER=hf_endpoint + ALLAM_HF_ENDPOINT_URL, "
            "or LLM_PROVIDER=ollama + LLM_MODEL=allam (after: ollama pull allam)"
        )
        return create_llm_engine(
            model=model, base_url=base_url, temperature=temperature, provider="hf_endpoint"
        )

    # ── Google Gemini API (100% FREE via Google AI Studio) ───────────────
    if selected_provider == "gemini":
        gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "") or settings.LLM_API_KEY
        if not gemini_key or gemini_key == "ollama":
            raise ValueError(
                "For LLM_PROVIDER=gemini, please get a FREE API key from:\n"
                "  👉 https://aistudio.google.com/\n"
                "And set in .env: GEMINI_API_KEY=AIzaSyxxxx..."
            )
        gemini_model = selected_model if "gemini" in selected_model else "gemini-2.0-flash"
        logger.info(f"Initializing Google Gemini API (FREE Tier): model='{gemini_model}'")
        return openai_plugin.LLM(
            model=gemini_model,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=gemini_key,
            temperature=selected_temp,
        )

    # ── Self-hosted: Ollama / vLLM (RECOMMENDED for free local inference) ─
    if selected_provider in ("ollama", "vllm"):
        logger.info(
            f"Initializing local LLM [{selected_provider}] "
            f"model='{selected_model}' at '{selected_base_url}' (temp={selected_temp})\n"
            f"  Tip: 'ollama pull qwen2.5:7b' for great Arabic quality (free)\n"
            f"  Tip: 'ollama pull allam' for authentic Saudi Arabic (when available)"
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

import sys
import io
import asyncio

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from agent.llm_service import create_llm_engine
from agent.prompts import NAJDI_SYSTEM_PROMPT

def test_gemini():
    try:
        engine = create_llm_engine()
        print("✅ Gemini LLM Engine Initialized Successfully:", engine)
    except Exception as e:
        print("❌ Error Initializing Gemini LLM Engine:", e)

if __name__ == "__main__":
    test_gemini()

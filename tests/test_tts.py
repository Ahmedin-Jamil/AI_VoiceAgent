import asyncio
import edge_tts
import sys
import io
from agent.phonetic_normalizer import normalize_saudi_arabic

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test_tts():
    raw_text = "يا هلا والله! أبشر بعزك، الحين أحجز لك الموعد عند الدكتور بالرياض."
    normalized = normalize_saudi_arabic(raw_text)
    print("Raw Text:", raw_text)
    print("Normalized Text (with Saudi diacritics & pauses):", normalized)

    voice = "ar-SA-HamedNeural"
    output_file = "tests/test_saudi_audio.mp3"

    communicate = edge_tts.Communicate(normalized, voice)
    await communicate.save(output_file)
    print(f"✅ Audio generated successfully and saved to {output_file}!")

if __name__ == "__main__":
    asyncio.run(test_tts())

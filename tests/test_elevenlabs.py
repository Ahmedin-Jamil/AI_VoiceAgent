import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

api_key = "sk_a5f35b92d8743319a1d3294b9deee44ea02d62cf432f8e42"
# Default ElevenLabs voice (e.g. Adam / Multilingual)
voice_id = "pNInz6obpgDQGcFmaJgB" 

url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
headers = {
    "xi-api-key": api_key,
    "Content-Type": "application/json"
}
payload = {
    "text": "يا هلا والله ومسهلا! أبشر بعزك، الحين أظبط لك الموعد عند الدكتور بالرياض.",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
        "stability": 0.5,
        "similarity_boost": 0.75
    }
}

data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
req = urllib.request.Request(url, data=data, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        audio_data = response.read()
        output_path = "tests/test_elevenlabs_saudi.mp3"
        with open(output_path, "wb") as f:
            f.write(audio_data)
        print(f"✅ ElevenLabs Human Audio generated successfully! Saved to {output_path} ({len(audio_data)} bytes)")
except Exception as e:
    print("Error querying ElevenLabs:", e)

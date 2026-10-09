import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from agent.prompts import NAJDI_SYSTEM_PROMPT

url = "http://127.0.0.1:11434/api/chat"
payload = {
    "model": "qwen2.5:7b",
    "messages": [
        {"role": "system", "content": NAJDI_SYSTEM_PROMPT},
        {"role": "user", "content": "السلام عليكم، كيف أحجز موعد عند الدكتور بالرياض؟"}
    ],
    "stream": False,
    "options": {
        "temperature": 0.3
    }
}

data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json; charset=utf-8'})

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode('utf-8'))
        print("=== Ollama Qwen2.5 Chat Response (Najdi Arabic) ===")
        print(res.get("message", {}).get("content"))
except Exception as e:
    print("Error querying Ollama:", e)

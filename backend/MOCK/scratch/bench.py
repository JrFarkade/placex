import os, time
from dotenv import load_dotenv
load_dotenv('placex_files/.env')
from google import genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

test_models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']

for m in test_models:
    t0 = time.time()
    try:
        r = client.models.generate_content(model=m, contents='Say hello in five words.')
        dt = (time.time() - t0) * 1000
        print(f"[{m}] -> {dt:.0f}ms | Response: {r.text.strip()}")
    except Exception as e:
        print(f"[{m}] -> ERROR: {e}")

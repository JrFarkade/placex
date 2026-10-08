import os, time, asyncio
from dotenv import load_dotenv
load_dotenv('placex_files/.env')
from google import genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

test_models = [
    'gemini-flash-latest',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
]

async def test_one(m):
    t0 = time.time()
    try:
        r = await client.aio.models.generate_content(
            model=m,
            contents='Reply with exactly the word READY.'
        )
        dt = (time.time() - t0) * 1000
        print(f"[{m}] -> {dt:.0f}ms | Response: {r.text.strip()[:40]}")
    except Exception as e:
        print(f"[{m}] -> ERROR: {e}")

async def main():
    print("Testing models concurrently...")
    await asyncio.gather(*(test_one(m) for m in test_models))

asyncio.run(main())

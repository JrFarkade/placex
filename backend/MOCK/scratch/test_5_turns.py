import asyncio, os, time
from dotenv import load_dotenv
load_dotenv('placex_files/.env')
from google import genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
model = os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite')

async def run_5_turns():
    print(f"Testing 5 turns with model: {model}")
    for i in range(1, 6):
        t0 = time.time()
        first_chunk = None
        full_text = []
        response_stream = await client.aio.models.generate_content_stream(
            model=model,
            contents=f"Turn {i}: The candidate said: 'We used Redis for caching to reduce database load.' Evaluate and ask a follow-up in 1 punchy sentence."
        )
        async for chunk in response_stream:
            if first_chunk is None:
                first_chunk = time.time()
            full_text.append(chunk.text or "")
        ttfb = (first_chunk - t0) * 1000 if first_chunk else 0
        total = (time.time() - t0) * 1000
        text_preview = "".join(full_text).strip().replace("\n", " ")
        print(f"Turn {i}: TTFB = {ttfb:.0f}ms | Total = {total:.0f}ms | {text_preview}")

asyncio.run(run_5_turns())

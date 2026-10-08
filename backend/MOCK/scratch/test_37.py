import asyncio, os, time
from dotenv import load_dotenv
load_dotenv('placex_files/.env')
from google import genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

async def test_37():
    t0 = time.time()
    first_chunk = None
    full_text = []
    try:
        response_stream = await client.aio.models.generate_content_stream(
            model='gemini-3.7-flash',
            contents='Introduce yourself as the PlaceX technical interviewer for Stripe in 2 punchy sentences.'
        )
        async for chunk in response_stream:
            if first_chunk is None:
                first_chunk = time.time()
            full_text.append(chunk.text or "")
            
        ttfb = (first_chunk - t0) * 1000 if first_chunk else 0
        total = (time.time() - t0) * 1000
        print(f"[gemini-3.7-flash STREAM] TTFB: {ttfb:.0f}ms | Total: {total:.0f}ms | Text: {''.join(full_text)}")
    except Exception as e:
        print(f"[gemini-3.7-flash] ERROR: {e}")

asyncio.run(test_37())

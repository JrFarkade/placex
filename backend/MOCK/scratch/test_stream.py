import asyncio, os, time
from dotenv import load_dotenv
load_dotenv('placex_files/.env')
from google import genai

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

async def test_stream():
    t0 = time.time()
    first_chunk = None
    full_text = []
    
    response_stream = await client.aio.models.generate_content_stream(
        model='gemini-flash-latest',
        contents='Introduce yourself as the PlaceX technical interviewer for Stripe in 2 punchy sentences.'
    )
    async for chunk in response_stream:
        if first_chunk is None:
            first_chunk = time.time()
        full_text.append(chunk.text or "")
        
    ttfb = (first_chunk - t0) * 1000 if first_chunk else 0
    total = (time.time() - t0) * 1000
    print(f"[gemini-flash-latest STREAM] TTFB: {ttfb:.0f}ms | Total: {total:.0f}ms")
    print(f"Generated text: {''.join(full_text)}")

asyncio.run(test_stream())

import os
import json
import asyncio
import websockets
from dotenv import load_dotenv

load_dotenv('placex_files/.env', override=True)
api_key = os.getenv('ELEVENLABS_API_KEY', '')
voice_id = os.getenv('ELEVENLABS_VOICE_ID', '')

async def test_ws_streaming():
    uri = f"wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id=eleven_flash_v2_5"
    headers = [("xi-api-key", api_key)]
    print(f"Connecting to: {uri}")
    try:
        async with websockets.connect(uri, additional_headers=headers) as ws:
            print("[+] WebSocket connected successfully to ElevenLabs stream-input!")
            
            # Send initial message (BOS)
            bos_message = {
                "text": " ",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
                "generation_config": {"chunk_length_schedule": [120, 160, 250, 290]},
                "xi_api_key": api_key
            }
            await ws.send(json.dumps(bos_message))
            print("[+] Sent BOS message")
            
            # Send text
            text_msg = {"text": "Hello! This is a test of streaming ElevenLabs audio. ", "try_trigger_generation": True}
            await ws.send(json.dumps(text_msg))
            print("[+] Sent text chunk")
            
            # Send EOS
            eos_msg = {"text": ""}
            await ws.send(json.dumps(eos_msg))
            print("[+] Sent EOS message")
            
            total_audio_bytes = 0
            chunks_count = 0
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if "audio" in data and data["audio"]:
                    import base64
                    audio_chunk = base64.b64decode(data["audio"])
                    total_audio_bytes += len(audio_chunk)
                    chunks_count += 1
                if data.get("isFinal"):
                    print(f"[+] Streaming Completed! Received {chunks_count} audio chunks ({total_audio_bytes} bytes).")
                    break
    except Exception as err:
        print(f"[-] WebSocket streaming error: {err}")

asyncio.run(test_ws_streaming())

import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv('placex_files/.env', override=True)
api_key = os.getenv('ELEVENLABS_API_KEY', '')
voice_id = os.getenv('ELEVENLABS_VOICE_ID', '')

print(f"=== ElevenLabs Key Diagnostic ===")
print(f"Key Prefix: {api_key[:8]}... (length={len(api_key)})")
print(f"Voice ID: {voice_id}")

# 1. User info & subscription
print("\n[Test 1: User / Subscription Endpoint]")
req_sub = urllib.request.Request(
    'https://api.elevenlabs.io/v1/user/subscription',
    headers={'xi-api-key': api_key}
)
try:
    with urllib.request.urlopen(req_sub) as resp:
        sub_data = json.loads(resp.read().decode())
        print("Status: 200 OK")
        print(f"Tier: {sub_data.get('tier')}")
        print(f"Character Count Used: {sub_data.get('character_count')}")
        print(f"Character Limit: {sub_data.get('character_limit')}")
        remaining = (sub_data.get('character_limit') or 0) - (sub_data.get('character_count') or 0)
        print(f"Characters Remaining: {remaining}")
        print(f"Status: {sub_data.get('status')}")
        print(f"Next Reset: {sub_data.get('next_character_count_reset_unix')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(f"Body: {e.read().decode('utf-8', errors='ignore')}")
except Exception as e:
    print(f"Exception: {e}")

# 2. Voices endpoint
print("\n[Test 2: Voices Endpoint]")
req_voices = urllib.request.Request(
    'https://api.elevenlabs.io/v1/voices',
    headers={'xi-api-key': api_key}
)
try:
    with urllib.request.urlopen(req_voices) as resp:
        voices_data = json.loads(resp.read().decode())
        voices = voices_data.get('voices', [])
        print(f"Status: 200 OK — Found {len(voices)} voices")
        matching = [v for v in voices if v.get('voice_id') == voice_id]
        if matching:
            print(f"[+] Voice ID '{voice_id}' MATCHED: '{matching[0].get('name')}' (category: {matching[0].get('category')})")
        else:
            print(f"[-] Voice ID '{voice_id}' NOT found in voice list.")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(f"Body: {e.read().decode('utf-8', errors='ignore')}")
except Exception as e:
    print(f"Exception: {e}")

# 3. Models endpoint
print("\n[Test 3: Models Endpoint]")
req_models = urllib.request.Request(
    'https://api.elevenlabs.io/v1/models',
    headers={'xi-api-key': api_key}
)
try:
    with urllib.request.urlopen(req_models) as resp:
        models_data = json.loads(resp.read().decode())
        print(f"Status: 200 OK — Available models:")
        for m in models_data:
            print(f" - {m.get('model_id')}: {m.get('name')} (can_do_text_to_speech: {m.get('can_do_text_to_speech')})")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(f"Body: {e.read().decode('utf-8', errors='ignore')}")
except Exception as e:
    print(f"Exception: {e}")

# 4. Generate TTS audio (eleven_flash_v2_5)
print("\n[Test 4: TTS Generation (eleven_flash_v2_5)]")
payload = {
    'text': 'Hello, this is a diagnostic test for the PlaceX Live Brain interviewer audio stream.',
    'model_id': 'eleven_flash_v2_5'
}
req_tts = urllib.request.Request(
    f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}',
    data=json.dumps(payload).encode('utf-8'),
    headers={
        'xi-api-key': api_key,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
    },
    method='POST'
)
try:
    with urllib.request.urlopen(req_tts) as resp:
        audio_bytes = resp.read()
        print(f"[+] Success: Generated {len(audio_bytes)} bytes of MPEG audio")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(f"Body: {e.read().decode('utf-8', errors='ignore')}")
except Exception as e:
    print(f"Exception: {e}")

# 5. Test WebSocket streaming endpoint (similar to Pipecat)
print("\n[Test 5: WebSocket Streaming Test via websockets library]")
import asyncio
import websockets

async def test_ws():
    uri = f"wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id=eleven_flash_v2_5"
    headers = {"xi-api-key": api_key}
    try:
        async with websockets.connect(uri, extra_headers=headers) as ws:
            print("[+] WebSocket connected successfully to ElevenLabs stream-input!")
            # Send initial message
            bos_message = {
                "text": " ",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
                "generation_config": {"chunk_length_schedule": [120, 160, 250, 290]},
                "xi_api_key": api_key
            }
            await ws.send(json.dumps(bos_message))
            # Send text
            text_msg = {"text": "Testing live voice synthesis. ", "try_trigger_generation": True}
            await ws.send(json.dumps(text_msg))
            # Send EOS
            eos_msg = {"text": ""}
            await ws.send(json.dumps(eos_msg))
            
            received_audio = False
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                if "audio" in data and data["audio"]:
                    received_audio = True
                if data.get("isFinal"):
                    print(f"[+] WebSocket received final message (received_audio={received_audio})")
                    break
    except Exception as err:
        print(f"[-] WebSocket test failed: {err}")

asyncio.run(test_ws())

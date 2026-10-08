"""
Raw HTTP POST test to Simli compose/token without SDK.
Makes 5 consecutive requests and reports raw status code and full response body.
"""

import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv
import httpx

workspace_root = Path(__file__).resolve().parent.parent
dotenv_path = workspace_root / "placex_files" / ".env"
load_dotenv(dotenv_path=dotenv_path, override=True)

simli_api_key = os.getenv("SIMLI_API_KEY", "").strip()
simli_face_id = os.getenv("SIMLI_FACE_ID", "").strip()
simli_http_url = os.getenv("SIMLI_HTTP_URL", "https://api.simli.ai").strip()

url = f"{simli_http_url}/compose/token"
headers = {
    "x-simli-api-key": simli_api_key,
    "Content-Type": "application/json",
}
payload = {
    "faceId": simli_face_id,
    "handleSilence": True,
    "maxSessionLength": 605,
    "maxIdleTime": 35,
    "model": "fasttalk",
}

print("=" * 70)
print(f" Simli Raw HTTP POST Test: {url}")
print(f" API Key Prefix: {simli_api_key[:6]}... (len={len(simli_api_key)})")
print(f" Face ID: {simli_face_id}")
print("=" * 70)

with httpx.Client(timeout=15.0) as client:
    for i in range(1, 6):
        start_t = time.perf_counter()
        try:
            resp = client.post(url, headers=headers, json=payload)
            elapsed_ms = (time.perf_counter() - start_t) * 1000
            print(f"\n[Request {i}/5] Latency: {elapsed_ms:.1f}ms")
            print(f"  Status Code: {resp.status_code} ({resp.reason_phrase})")
            print(f"  Response Body: {resp.text}")
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_t) * 1000
            print(f"\n[Request {i}/5] Latency: {elapsed_ms:.1f}ms")
            print(f"  Error: {type(e).__name__}: {e}")
print("\n" + "=" * 70)

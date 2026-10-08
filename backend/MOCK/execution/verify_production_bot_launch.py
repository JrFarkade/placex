"""
Verification of the exact production launch path:
1. Candidate logs in & completes setup form.
2. Triggers Django view setup_launch_interview -> spawns bot.py as subprocess.
3. Sends POST /start to the spawned bot.py FastAPI runner on http://localhost:7860.
4. Captures and prints the exact, unedited log file written to .tmp/bot_session_<id>.log by bot.py.
"""

import os
import sys
import time
import json
import uuid
import asyncio
import urllib.request
from pathlib import Path
from dotenv import find_dotenv, load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

workspace_root = Path(__file__).resolve().parent.parent
webapp_path = workspace_root / "webapp"
execution_path = workspace_root / "execution"
placex_path = workspace_root / "placex_files"

for p in [str(workspace_root), str(webapp_path), str(execution_path), str(placex_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")
import django
django.setup()

from django.test import Client
from accounts.models import PlaceXUser
from dashboard.models import InterviewSetup, InterviewSession
from aiortc import RTCPeerConnection, RTCSessionDescription

async def main_async():
    print("=" * 75)
    print(" PlaceX — Exact Production Subprocess Spawn Verification")
    print("=" * 75)

    # 1. Candidate Login
    user, _ = PlaceXUser.objects.get_or_create(
        username="prod_candidate",
        defaults={"email": "prod@placex.ai", "target_role": "Staff Engineer", "target_level": "Staff"},
    )
    client = Client()
    client.force_login(user)

    # 2. Submit Setup Form (creates InterviewSetup + QuestionBank)
    print("\n[Step 1] Submitting Django Setup Form...")
    setup_resp = client.post("/dashboard/setup/new/", data={
        "company": "Stripe",
        "role": "Staff Infrastructure Engineer",
        "difficulty": "Staff",
        "domain_interests": "Distributed Consensus, Kafka",
    }, follow=True)
    setup = InterviewSetup.objects.filter(candidate=user).order_by("-created_at").first()
    print(f"  --> Setup #{setup.id} created with Question Bank.")

    # 3. Trigger setup_launch_interview view (SPAWNS bot.py SUBPROCESS)
    print("\n[Step 2] Invoking setup_launch_interview view (Spawning bot.py subprocess)...")
    launch_resp = client.get(f"/dashboard/setup/{setup.id}/launch/", follow=True)
    session = InterviewSession.objects.filter(candidate=user).order_by("-created_at").first()
    print(f"  --> Spawned subprocess for Session #{session.id.hex[:8]}")

    log_path = workspace_root / ".tmp" / f"bot_session_{session.id}.log"
    print(f"  --> Subprocess log destination: {log_path}")

    # 4. Wait for bot.py runner server to boot up on http://localhost:7860
    print("\n[Step 3] Waiting for bot.py server to initialize on http://localhost:7860...")
    server_ready = False
    for attempt in range(15):
        time.sleep(1)
        try:
            with urllib.request.urlopen("http://localhost:7860/", timeout=2) as resp:
                if resp.status in (200, 404):
                    server_ready = True
                    print(f"  --> bot.py server is READY on port 7860 (Attempt {attempt+1})")
                    break
        except Exception:
            continue

    if not server_ready:
        print("  [!] Server took longer than 15s to respond, checking current log...")

    # 5. Send POST /start to register session
    print("\n[Step 4] Sending POST /start to bot.py server...")
    session_id = None
    try:
        req = urllib.request.Request(
            "http://localhost:7860/start",
            data=json.dumps({"transport": "webrtc"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as start_resp:
            result_raw = start_resp.read().decode("utf-8")
            result_json = json.loads(result_raw)
            session_id = result_json.get("sessionId")
            print(f"  --> /start registered session: {session_id}")
    except Exception as e:
        print(f"  --> /start request failed: {e}")

    # 6. Send WebRTC Offer to trigger bot(runner_args) -> run_bot in bot.py
    if session_id:
        print(f"\n[Step 5] Sending WebRTC Offer for session {session_id} to trigger bot pipeline...")
        pc = RTCPeerConnection()
        pc.addTransceiver("audio", direction="sendrecv")
        offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        offer_payload = {
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
            "pc_id": str(uuid.uuid4()),
        }
        try:
            req = urllib.request.Request(
                f"http://localhost:7860/sessions/{session_id}/api/offer",
                data=json.dumps(offer_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as offer_resp:
                answer_raw = offer_resp.read().decode("utf-8")
                answer_json = json.loads(answer_raw)
                answer = RTCSessionDescription(sdp=answer_json["sdp"], type=answer_json["type"])
                await pc.setRemoteDescription(answer)
                print(f"  --> WebRTC handshake complete. Pipeline launched!")
        except Exception as e:
            print(f"  --> WebRTC offer error: {e}")

    # 7. Wait for Simli connection attempt loop in bot.py to execute
    print("\n[Step 6] Waiting for bot.py to execute ResilientSimliVideoService connection loop (45s)...")
    await asyncio.sleep(45)

    if 'pc' in locals():
        await pc.close()

    # 8. Read and display the exact, unedited log written by bot.py
    print("\n" + "=" * 75)
    print(f" RAW LOG CONTENTS: {log_path.name}")
    print("=" * 75)
    if log_path.exists():
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            raw_log = f.read()
        print(raw_log if raw_log.strip() else "[EMPTY LOG]")
    else:
        print(f"[!] Log file not found at {log_path}")
    print("=" * 75)


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()

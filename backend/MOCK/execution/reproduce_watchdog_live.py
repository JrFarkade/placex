"""
Multi-turn Live Brain Interruption & Watchdog Repro Runner:
1. Spawns bot.py via Django setup_launch_interview subprocess path.
2. Connects over WebRTC with full audio track sending PCM frames.
3. Turn 1: Sends 'I am audible.' PCM audio -> waits for bot to process and speak.
4. Turn 2: Sends 'Can you repeat the question in short?' PCM audio (interrupting mid-speech).
5. Turn 3: Sends 'I worked on a real-time messaging pipeline...'
6. Turn 4: Sends 'We used partition-level parallelism...'
7. Observes if pause_watchdog fires or if Simli audio echo recovers.
8. Captures and saves the full unedited session log.
"""

import os
import sys
import time
import json
import uuid
import asyncio
import urllib.request
import av
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
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from fractions import Fraction


class CandidateAudioTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self):
        super().__init__()
        self.sample_rate = 48000
        self.samples = 960
        self.time_base = Fraction(1, 48000)
        self._pts = 0
        self._start = None
        self.queue = asyncio.Queue()

    async def enqueue_pcm(self, pcm_bytes: bytes):
        chunk_size = 960 * 2  # 1920 bytes (20ms at 48kHz mono 16-bit)
        for i in range(0, len(pcm_bytes), chunk_size):
            chunk = pcm_bytes[i : i + chunk_size]
            if len(chunk) < chunk_size:
                chunk = chunk.ljust(chunk_size, b"\x00")
            await self.queue.put(chunk)

    async def recv(self):
        if self._start is None:
            self._start = time.time()

        expected_time = self._pts / self.sample_rate
        actual_time = time.time() - self._start
        if expected_time > actual_time:
            await asyncio.sleep(expected_time - actual_time)

        try:
            chunk = self.queue.get_nowait()
        except asyncio.QueueEmpty:
            chunk = b"\x00" * 1920

        frame = av.AudioFrame(format="s16", layout="mono", samples=960)
        frame.planes[0].update(chunk)
        frame.pts = self._pts
        frame.sample_rate = 48000
        frame.time_base = self.time_base
        self._pts += 960
        return frame


async def main_async():
    print("=" * 75)
    print(" PlaceX — Live Interruption & Multi-Turn Watchdog Reproduction")
    print("=" * 75)

    # 1. Candidate Login
    user, _ = PlaceXUser.objects.get_or_create(
        username="diag_candidate",
        defaults={"email": "diag@placex.ai", "target_role": "Distributed Systems Engineer", "target_level": "Senior"},
    )
    client = Client()
    client.force_login(user)

    # 2. Submit Setup Form
    print("\n[Step 1] Submitting Django Setup Form...")
    setup_resp = client.post("/dashboard/setup/new/", data={
        "company": "Netflix",
        "role": "Distributed Systems Engineer",
        "difficulty": "Senior",
        "domain_interests": "Distributed Systems, Caching",
    }, follow=True)
    setup = InterviewSetup.objects.filter(candidate=user).order_by("-created_at").first()
    print(f"  --> Setup #{setup.id} created.")

    # 3. Trigger setup_launch_interview view (Spawns bot.py)
    print("\n[Step 2] Spawning bot.py subprocess...")
    launch_resp = client.get(f"/dashboard/setup/{setup.id}/launch/", follow=True)
    session = InterviewSession.objects.filter(candidate=user).order_by("-created_at").first()
    print(f"  --> Spawned subprocess for Session #{session.id.hex[:8]}")
    log_path = workspace_root / ".tmp" / f"bot_session_{session.id}.log"
    print(f"  --> Subprocess log destination: {log_path}")

    # 4. Wait for server on port 7860
    print("\n[Step 3] Waiting for bot.py server on http://localhost:7860...")
    for attempt in range(25):
        await asyncio.sleep(1)
        try:
            with urllib.request.urlopen("http://localhost:7860/", timeout=2) as resp:
                if resp.status in (200, 307, 404):
                    print(f"  --> bot.py server is READY on port 7860 (Attempt {attempt+1})")
                    break
        except Exception:
            continue

    # 5. Register session via POST /start
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
        return

    # 6. WebRTC PeerConnection with Audio Track
    audio_track = CandidateAudioTrack()
    pc = RTCPeerConnection()
    pc.addTrack(audio_track)
    pc.addTransceiver("video", direction="recvonly")

    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    offer_payload = {
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type,
        "pc_id": str(uuid.uuid4()),
    }
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
        print(f"  --> WebRTC handshake complete. Pipeline active!")

    # 7. Wait for initial greeting
    print("\n[Step 4] Waiting 12s for initial Simli connection and bot greeting...")
    await asyncio.sleep(12)

    # 8. Turn 1: Send 'I am audible.'
    pcm1_file = workspace_root / ".tmp" / "cand_turn1_48k.pcm"
    if pcm1_file.exists():
        pcm1 = pcm1_file.read_bytes()
        print(f"\n[Step 5] Speaking Turn 1 ('I am audible.' - {len(pcm1)} bytes PCM)...")
        await audio_track.enqueue_pcm(pcm1)

    # Wait 4s while bot begins speaking Turn 1 response, then INTERRUPT mid-speech
    print("  --> Waiting 4s to let bot start speaking, then interrupting...")
    await asyncio.sleep(4)

    # 9. Turn 2: Send 'Can you repeat the question in short?' (interrupting mid-speech)
    pcm2_file = workspace_root / ".tmp" / "cand_turn2_48k.pcm"
    if pcm2_file.exists():
        pcm2 = pcm2_file.read_bytes()
        print(f"\n[Step 6] Interrupting with Turn 2 ('Can you repeat the question in short?' - {len(pcm2)} bytes PCM)...")
        await audio_track.enqueue_pcm(pcm2)

    # Wait 7s
    print("  --> Waiting 7s for Turn 2 response...")
    await asyncio.sleep(7)

    # 10. Turn 3: Follow-up answer
    pcm3_file = workspace_root / ".tmp" / "cand_turn3_48k.pcm"
    if pcm3_file.exists():
        pcm3 = pcm3_file.read_bytes()
        print(f"\n[Step 7] Speaking Turn 3 ('I worked on a real-time messaging pipeline...' - {len(pcm3)} bytes PCM)...")
        await audio_track.enqueue_pcm(pcm3)

    # Wait 7s
    print("  --> Waiting 7s for Turn 3 response...")
    await asyncio.sleep(7)

    # 11. Turn 4: Further architectural detail
    pcm4_file = workspace_root / ".tmp" / "cand_turn4_48k.pcm"
    if pcm4_file.exists():
        pcm4 = pcm4_file.read_bytes()
        print(f"\n[Step 8] Speaking Turn 4 ('We used partition-level parallelism...' - {len(pcm4)} bytes PCM)...")
        await audio_track.enqueue_pcm(pcm4)

    # Wait 22s to observe any watchdog expiry or trailing behavior
    print("  --> Waiting 22s to capture multi-turn pipeline behavior and any watchdog event...")
    await asyncio.sleep(22)

    await pc.close()

    # 12. Output the raw log
    print("\n" + "=" * 75)
    print(f" RAW SUBPROCESS LOG: {log_path.name}")
    print("=" * 75)
    if log_path.exists():
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            raw_log = f.read()
        print(f"Log captured ({len(raw_log)} characters). File: {log_path}")
    else:
        print(f"[!] Log file not found: {log_path}")
    print("=" * 75)


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()

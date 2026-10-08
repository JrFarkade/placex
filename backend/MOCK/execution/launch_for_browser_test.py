"""
Launches a live production bot subprocess via Django setup_launch_interview,
and waits until the Pipecat WebRTC client is ready at http://localhost:7860.
Leaves the server running so browser subagent can interact with http://localhost:7860/client/
"""

import os
import sys
import time
import subprocess
import urllib.request
from pathlib import Path

workspace_root = Path(__file__).resolve().parent.parent
webapp_path = workspace_root / "webapp"
execution_path = workspace_root / "execution"
placex_path = workspace_root / "placex_files"

for p in [str(workspace_root), str(webapp_path), str(execution_path), str(placex_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Kill any existing process on port 7860
try:
    out = subprocess.check_output("netstat -ano | findstr :7860", shell=True, text=True, stderr=subprocess.DEVNULL)
    for line in out.strip().splitlines():
        parts = line.strip().split()
        if len(parts) >= 5 and "LISTENING" in line:
            pid = parts[-1]
            subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
except Exception:
    pass

time.sleep(1)

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")
import django
django.setup()

from django.test import Client
from accounts.models import PlaceXUser
from dashboard.models import InterviewSetup, InterviewSession

print("=" * 75)
print(" PlaceX — Spawning Live Production Bot for Browser Test")
print("=" * 75)

user, _ = PlaceXUser.objects.get_or_create(
    username="browser_candidate",
    defaults={"email": "browser@placex.ai", "target_role": "Senior Distributed Systems Engineer", "target_level": "Senior"},
)
client = Client()
client.force_login(user)

print("\n[1] Submitting Setup Form...")
setup_resp = client.post("/dashboard/setup/new/", data={
    "company": "Netflix",
    "role": "Senior Distributed Systems Engineer",
    "difficulty": "Senior",
    "domain_interests": "Microservices, Distributed Caching, High Availability",
}, follow=True)
setup = InterviewSetup.objects.filter(candidate=user).order_by("-created_at").first()
print(f"    Created Setup #{setup.id}")

print("\n[2] Triggering setup_launch_interview view (Spawning bot.py)...")
launch_resp = client.get(f"/dashboard/setup/{setup.id}/launch/", follow=True)
session = InterviewSession.objects.filter(candidate=user).order_by("-created_at").first()
print(f"    Spawned Session #{session.id.hex[:8]}")
log_path = workspace_root / ".tmp" / f"bot_session_{session.id}.log"
print(f"    Subprocess log: {log_path}")

print("\n[3] Waiting for Pipecat Runner on http://localhost:7860...")
server_ready = False
for attempt in range(20):
    time.sleep(1)
    try:
        with urllib.request.urlopen("http://localhost:7860/", timeout=2) as resp:
            if resp.status in (200, 307, 404):
                server_ready = True
                print(f"    Server is READY on http://localhost:7860 (Attempt {attempt+1})")
                break
    except Exception:
        continue

if server_ready:
    print("\n[SUCCESS] Bot server is running at http://localhost:7860/client/")
    print("Keeping server alive for browser subagent observation (sleeping)...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping server...")
else:
    print("\n[ERROR] Bot server failed to respond within 20 seconds.")

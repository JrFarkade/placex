"""
Standalone Direct Pipecat Session Runner
Runs the full Pipecat pipeline (Deepgram STT + Gemini LLM + ElevenLabs TTS + Simli Avatar)
without any Django overhead.
Hosts local WebRTC client directly at http://localhost:7860/client/
"""

import os
import sys
import time
import subprocess
import urllib.request
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

workspace_root = Path(__file__).resolve().parent.parent
execution_path = workspace_root / "execution"
placex_path = workspace_root / "placex_files"

# Set environment
sample_qb = execution_path / "sample_question_bank.json"
tmp_dir = workspace_root / ".tmp"
tmp_dir.mkdir(parents=True, exist_ok=True)
log_file = tmp_dir / "standalone_pipecat_session.log"

# Check if port 7860 is already responding
server_ready = False
try:
    with urllib.request.urlopen("http://localhost:7860/", timeout=2) as resp:
        if resp.status in (200, 307, 404):
            server_ready = True
            print("[+] Pipecat server is already running on http://localhost:7860")
except Exception:
    pass

if not server_ready:
    # Kill any hung process on port 7860
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

    env = os.environ.copy()
    env["SESSION_ID"] = "standalone_test_session"
    env["QUESTION_BANK_PATH"] = str(sample_qb)
    env["PYTHONPATH"] = f"{placex_path}{os.pathsep}{execution_path}{os.pathsep}{env.get('PYTHONPATH', '')}"

    print("=" * 70)
    print(" PlaceX — Launching Standalone Pipecat Live Brain Session")
    print("=" * 70)
    print(f"[+] Python: {sys.executable}")
    print(f"[+] Injected Question Bank: {sample_qb}")
    print(f"[+] Session Log: {log_file}")

    bot_script = placex_path / "bot.py"
    log_fp = open(log_file, "w", encoding="utf-8")

    proc = subprocess.Popen(
        [sys.executable, str(bot_script)],
        env=env,
        cwd=str(placex_path),
        stdout=log_fp,
        stderr=subprocess.STDOUT,
    )

    print(f"[+] Pipecat process spawned (PID: {proc.pid})")
    print("[+] Waiting for WebRTC server on http://localhost:7860...")

    for attempt in range(25):
        time.sleep(1)
        try:
            with urllib.request.urlopen("http://localhost:7860/", timeout=2) as resp:
                if resp.status in (200, 307, 404):
                    server_ready = True
                    print(f"[+] Server is READY at http://localhost:7860 (Attempt {attempt+1})")
                    break
        except Exception:
            continue

if server_ready:
    print("\n" + "=" * 70)
    print(" [READY] LIVE PIPECAT SESSION ACTIVE")
    print(" >>> Open in your browser: http://localhost:7860/client/ <<<")
    print("=" * 70)
    print("\nPipeline Components Active:")
    print(" - Deepgram STT (Live Speech Recognition)")
    print(" - Gemini LLM (Brain & Calibrated Question Engine)")
    print(" - ElevenLabs TTS (Ultra-low latency Voice Synthesis)")
    print(" - Simli Video Avatar (Real-Time Face Sync)")
    print("\nKeeping session alive... (Press Ctrl+C to stop)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping Pipecat session...")
else:
    print("\n[!] Failed to connect to http://localhost:7860 within 25 seconds.")
    print(f"Check logs at: {log_file}")

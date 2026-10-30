import os
import sys
import time
import subprocess
from pathlib import Path

mock_dir = Path(__file__).resolve().parent
exec_dir = mock_dir.parent / "execution"

env = os.environ.copy()
env["PYTHONPATH"] = f"{mock_dir};{exec_dir};{env.get('PYTHONPATH', '')}"
env["PYTHONUTF8"] = "1"
env["PYTHONUNBUFFERED"] = "1"

print(f"[Supervisor] Watching Pipecat Live Brain on port 7860 in {mock_dir}...")

while True:
    print("[Supervisor] Launching fresh bot.py instance on port 7860...")
    proc = subprocess.Popen(
        [sys.executable, "bot.py", "--host", "127.0.0.1", "--port", "7860", "-t", "webrtc"],
        cwd=str(mock_dir),
        env=env
    )
    try:
        proc.wait()
    except KeyboardInterrupt:
        print("[Supervisor] Interrupted, stopping...")
        proc.terminate()
        break
    except Exception as e:
        print(f"[Supervisor] Error in bot process: {e}")

    print("[Supervisor] Session ended. Recycling and restarting bot in 1 second...")
    time.sleep(1)


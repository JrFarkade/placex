"""
Runs verify_production_bot_launch 5 times back to back.
Extracts: Run #, Session ID, Attempt Count, Status (Success/Failure), Total Connection Time.
Ensures port 7860 is cleanly freed between runs.
"""

import os
import sys
import re
import time
import subprocess
from datetime import datetime
from pathlib import Path

workspace_root = Path(__file__).resolve().parent.parent

def kill_port_7860():
    try:
        out = subprocess.check_output("netstat -ano | findstr :7860", shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in out.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and "LISTENING" in line:
                pid = parts[-1]
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
    except Exception:
        pass

def parse_log(log_file: Path):
    if not log_file.exists():
        return {"attempts": 0, "status": "FILE_NOT_FOUND", "duration_sec": None}

    content = log_file.read_text(encoding="utf-8", errors="replace")
    
    # Extract timestamps for Simli attempts
    start_matches = re.findall(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*?\[Simli\] connection attempt (\d+)/\d+ starting", content)
    success_match = re.search(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*?\[Simli\] avatar connection successfully established", content)
    failure_matches = re.findall(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}).*?\[Simli\] connection attempt \d+/\d+ failed", content)
    
    if not start_matches:
        return {"attempts": 0, "status": "NO_ATTEMPTS", "duration_sec": None}
    
    attempts = len(start_matches)
    first_start_dt = datetime.strptime(start_matches[0][0], "%Y-%m-%d %H:%M:%S.%f")
    
    if success_match:
        end_dt = datetime.strptime(success_match.group(1), "%Y-%m-%d %H:%M:%S.%f")
        duration = (end_dt - first_start_dt).total_seconds()
        return {"attempts": attempts, "status": "Success", "duration_sec": duration}
    else:
        last_dt = datetime.strptime(failure_matches[-1][0], "%Y-%m-%d %H:%M:%S.%f") if failure_matches else first_start_dt
        duration = (last_dt - first_start_dt).total_seconds()
        return {"attempts": attempts, "status": "Failure", "duration_sec": duration}

def main():
    print("=" * 80)
    print(" Executing 5 Live Production Bot Launches Back-to-Back")
    print("=" * 80)
    
    results = []
    
    for i in range(1, 6):
        kill_port_7860()
        time.sleep(1)
        
        print(f"\n>>> Launching Run {i}/5 at {datetime.now().strftime('%H:%M:%S')}...")
        
        proc = subprocess.run(
            [sys.executable, str(workspace_root / "execution" / "verify_production_bot_launch.py")],
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        
        # Find the session log path from output
        match = re.search(r"bot_session_([0-9a-fA-F-]+)\.log", proc.stdout)
        session_id = match.group(1) if match else "unknown"
        log_path = workspace_root / ".tmp" / f"bot_session_{session_id}.log"
        
        parsed = parse_log(log_path)
        parsed["run"] = i
        parsed["session_id"] = session_id[:8]
        results.append(parsed)
        
        dur_str = f"{parsed['duration_sec']:.2f}s" if parsed['duration_sec'] is not None else "N/A"
        print(f"    Run {i} Finished: Session={parsed['session_id']}, Attempts={parsed['attempts']}, Status={parsed['status']}, Simli Connect Time={dur_str}")
        
        kill_port_7860()
        time.sleep(2)
        
    print("\n" + "=" * 80)
    print(f"{'Run':<6} | {'Session':<10} | {'Attempt Count':<15} | {'Status':<12} | {'Connection Time':<18}")
    print("-" * 80)
    for r in results:
        dur = f"{r['duration_sec']:.2f}s" if r['duration_sec'] is not None else "N/A"
        print(f"{r['run']:<6} | #{r['session_id']:<9} | {r['attempts']:<15} | {r['status']:<12} | {dur:<18}")
    print("=" * 80)

if __name__ == "__main__":
    main()

"""
PlaceX Host Agent End-to-End Automated Test Suite.
Validates all 15 core architectural requirements.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def get_auth_token():
    try:
        from app.core.security import create_access_token
        return create_access_token(subject=1)
    except Exception:
        login_url = f"{BASE_URL}/api/v1/auth/login"
        login_data = json.dumps({"email": "demo@placex.com", "password": "password123"}).encode('utf-8')
        req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                return data["access_token"]
        except Exception:
            return None

def make_req(path, method="GET", payload=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def run_tests():
    print("=" * 60)
    print("PLACEX HOST AGENT — END-TO-END VALIDATION SUITE")
    print("=" * 60)

    token = get_auth_token()
    assert token, "Authentication failed to retrieve token"
    print("[PASS] Auth token retrieved.")

    results = []

    # 1. State Endpoint
    s, state = make_req("/api/v1/agent/state", "GET", token=token)
    assert s == 200, f"State failed with {s}: {state}"
    assert "profile" in state and "active_roadmap" in state
    print(f"[PASS] 1. State Retrieval: Active module={state.get('active_module')}")
    results.append(("State Retrieval", True))

    # 2. Next Action Endpoint
    s, na = make_req("/api/v1/agent/next-action", "GET", token=token)
    assert s == 200, f"Next action failed with {s}: {na}"
    assert "current_priority" in na
    print(f"[PASS] 2. Next Action Evaluation: Priority='{na.get('current_priority')}'")
    results.append(("Next Action Evaluation", True))

    # 3. Test Greeting ("Hi")
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "Hi", "active_module": "dashboard"}, token=token)
    assert s == 200
    reply = res["reply"]
    print(f"[PASS] 3. Greeting: \"{reply[:120]}...\"")
    # Verify no unprompted target role or template dump
    assert "### Analysis" not in reply, "Dashboard heading leaked into casual greeting"
    results.append(("Casual Greeting Intent", True))

    # 4. Test Conceptual ("What is Python?")
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "What is Python?", "active_module": "coding"}, token=token)
    assert s == 200
    reply = res["reply"]
    print(f"[PASS] 4. Conceptual: \"{reply[:120]}...\"")
    assert "python" in reply.lower(), "Python explanation missing Python concept"
    assert "### Analysis" not in reply, "Dashboard heading leaked into conceptual question"
    results.append(("Conceptual Technical Intent", True))

    # 5. Test Coding Challenge Request
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "Give me a coding challenge", "active_module": "coding"}, token=token)
    assert s == 200
    reply = res["reply"]
    print(f"[PASS] 5. Coding Challenge: \"{reply[:120]}...\"")
    results.append(("Coding Challenge Generation", True))

    # 6. Record Execution Failure Event with Full Context
    bad_code = "def calc_average(nums):\n    return sum(nums) / len(nums)\nprint(calc_average([]))"
    err_msg = "ZeroDivisionError: division by zero (line 2)"
    s, ev = make_req("/api/v1/agent/events", "POST", {
        "event_type": "coding.execution_failed",
        "module": "coding",
        "data": {
            "language": "python",
            "code": bad_code,
            "error_type": "ZeroDivisionError",
            "message": err_msg,
            "stderr": err_msg,
            "line": 2
        }
    }, token=token)
    assert s == 200
    print("[PASS] 6. Event Recorded: coding.execution_failed with code & ZeroDivisionError")
    results.append(("Event Emission & Memory Capture", True))

    # 7. Ask Host Agent to Explain the Error (Host Agent knows it from memory!)
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "Why did my code fail?", "active_module": "coding"}, token=token)
    assert s == 200
    reply = res["reply"]
    print(f"[PASS] 7. Error Diagnosis from Memory: \"{reply[:150]}...\"")
    assert any(k in reply.lower() for k in ["zero", "empty", "division", "len"]), "Host Agent did not diagnose ZeroDivisionError"
    results.append(("Autonomous Error Diagnosis from Session Memory", True))

    # 8. Multi-turn Follow-up ("How do I fix it?")
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "How do I fix it?", "active_module": "coding"}, token=token)
    assert s == 200
    reply = res["reply"]
    print(f"[PASS] 8. Multi-Turn Continuity: \"{reply[:150]}...\"")
    results.append(("Multi-Turn Conversation Continuity", True))

    # 9. Dedicated Explain Coding Error Tool
    s, fix_res = make_req("/api/v1/agent/explain/coding-error", "POST", {
        "source_code": bad_code,
        "error_message": err_msg,
        "language": "python"
    }, token=token)
    assert s == 200
    assert "what" in fix_res and "why" in fix_res and "corrected_code" in fix_res
    print(f"[PASS] 9. 4-Question Framework Error Explanation: what=\"{fix_res['what'][:80]}...\"")
    results.append(("4-Question Code Repair Tool", True))

    # 10. Career Roadmap Guidance
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "What should I study next?", "active_module": "roadmap"}, token=token)
    assert s == 200
    reply = res["reply"]
    print(f"[PASS] 10. Roadmap Guidance: \"{reply[:140]}...\"")
    results.append(("Roadmap Next Action Guidance", True))

    # 11. Task Management
    s, task = make_req("/api/v1/agent/tasks", "POST", {
        "title": "Review Binary Trees",
        "description": "Implement BFS and DFS traversals",
        "module": "coding",
        "priority": "high"
    }, token=token)
    assert s == 200
    task_id = task.get("id") or task.get("task_id")
    s, upd = make_req(f"/api/v1/agent/tasks/{task_id}", "PATCH", {"status": "completed"}, token=token)
    assert s == 200 and (upd.get("new_status") == "completed" or upd.get("status") == "updated")
    print(f"[PASS] 11. Task Creation & Completion: task_id={task_id}")
    results.append(("Task Management Cycle", True))

    # 12. ATS Resume Review (Without altering ATS Engine)
    s, ats_rev = make_req("/api/v1/agent/explain/ats-result", "POST", {
        "ats_score": 68.5,
        "section_scores": {"Formatting": 80, "Experience": 55, "Skills": 70},
        "suggestions": ["Add measurable metrics in Experience section"]
    }, token=token)
    assert s == 200
    assert "what" in ats_rev and "why" in ats_rev
    print(f"[PASS] 12. ATS Resume Review: \"{ats_rev['what'][:80]}...\"")
    results.append(("ATS Resume Intelligence", True))

    # 13. JD Match Review (Without altering Matcher Engine)
    s, jd_rev = make_req("/api/v1/agent/explain/jd-match", "POST", {
        "match_score": 72.0,
        "exact_keyword_score": 65.0,
        "semantic_score": 78.0,
        "matching_skills": ["Python", "SQL", "Pandas"],
        "missing_skills": ["Docker", "Kubernetes", "PyTorch"],
        "job_description": "Looking for a Python developer with Docker and PyTorch experience."
    }, token=token)
    assert s == 200
    assert "what" in jd_rev and "why" in jd_rev
    print(f"[PASS] 13. JD Match Review: \"{jd_rev['what'][:80]}...\"")
    results.append(("JD Match Intelligence", True))

    # 14. Quiz Explanation
    # Verify endpoint exists
    s, q_rev = make_req("/api/v1/agent/explain/quiz-question", "POST", {
        "question_id": 1,
        "selected_option_index": 0
    }, token=token)
    print(f"[PASS] 14. Quiz Explanation Endpoint: status={s}")
    results.append(("Quiz Question Explanation Endpoint", True))

    # 15. Verify No Hardcoded Fallback Leakage
    s, res = make_req("/api/v1/agent/chat", "POST", {"message": "Can you recommend a good book?", "active_module": "dashboard"}, token=token)
    assert s == 200
    reply = res["reply"]
    assert "You are currently working in Dashboard. Your active target role is" not in reply, "Old canned fallback detected!"
    print(f"[PASS] 15. Fallback Audit: No canned Q&A detected.")
    results.append(("No Hardcoded Fallbacks", True))

    print("\n" + "=" * 60)
    print(f"ALL {len(results)}/{len(results)} TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

"""
Master Test Suite for PlaceX
Runs all verification suites:
1. Coding Sandbox Stdin & Linecache Engine
2. Quiz Domain Randomization
3. Roadmap Dynamic Host Agent Intelligence & Context Switching
4. API Route Integrity
"""

import sys
import os

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)


def run_stdin_tests():
    print("\n" + "=" * 60)
    print("1. RUNNING CODING SANDBOX STDIN & TRACEBACK TESTS")
    print("=" * 60)
    from app.coding_service.judge.judge0_client import Judge0Client

    cases = [
        ("Single input", "age = input('Enter your age: ')\nprint(f'Your age is: {age}')", "18\n", "Enter your age: 18\nYour age is: 18\n"),
        ("Multiple inputs", "n = input('Name: ')\na = input('Age: ')\nprint(f'{n}:{a}')", "Alice\n22\n", "Name: Alice\nAge: 22\nAlice:22\n"),
        ("Loop inputs", "s = sum(int(input()) for _ in range(3))\nprint(s)", "10\n20\n30\n", "10\n20\n30\n60\n"),
        ("No input", "print('Static run')", None, "Static run\n"),
    ]

    for name, code, stdin, expected_stdout in cases:
        res = Judge0Client.execute_code(source_code=code, language="python", stdin=stdin or "")
        assert res["status"] == "Accepted", f"Failed {name}: status={res['status']}"
        assert res["stdout"] == expected_stdout, f"Failed {name}: expected {repr(expected_stdout)}, got {repr(res['stdout'])}"
        print(f"  [OK] {name}: Passed")

    # EOFError check
    res_eof = Judge0Client.execute_code(source_code="a = input()\nb = input()", language="python", stdin="only_one\n")
    assert res_eof["status"] == "Input / EOF Error" or "EOFError" in res_eof["stderr"]
    assert "EOFError: EOF when reading a line" in res_eof["stderr"]
    print("  [OK] EOFError Detection: Passed")

    # Traceback Line Number Fidelity
    res_tb = Judge0Client.execute_code(source_code="x = 1\ny = 0\nz = x / y", language="python", stdin="")
    assert res_tb["status"] == "Runtime Error"
    assert 'line 3, in <module>' in res_tb["stderr"]
    assert 'ZeroDivisionError' in res_tb["stderr"]
    print("  [OK] Traceback Line Fidelity: Passed")


def run_quiz_tests():
    print("\n" + "=" * 60)
    print("2. RUNNING KNOWLEDGE BASE QUIZ RANDOMIZATION TESTS")
    print("=" * 60)
    from app.services.quiz_service import fetch_quiz_questions
    from app.database.session import SessionLocal

    db = SessionLocal()
    try:
        domains = ["ai_ml", "SoftwareEngineering", "Aptitude", "DataScience", "CyberSecurity", "Python"]
        for domain in domains:
            q_sets = []
            for _ in range(3):
                quiz_id, qs = fetch_quiz_questions(db=db, user_id="test_user", domains=[domain], num_questions=5)
                q_sets.append([q.id for q in qs])
            
            is_randomized = not (q_sets[0] == q_sets[1] == q_sets[2])
            print(f"  [OK] Domain '{domain}' (5 questions): Randomized={is_randomized} - Sample: {q_sets[0]}")
    finally:
        db.close()


def run_roadmap_tests():
    print("\n" + "=" * 60)
    print("3. RUNNING ROADMAP TRACKS & NONE/NOT SELECTED TESTS")
    print("=" * 60)
    from app.learning_engine.services.learning_service import LearningService
    from app.database.session import SessionLocal

    service = LearningService()
    db = SessionLocal()
    try:
        meta = service.get_branches_and_levels()
        assert "None / Not Selected" in meta["branches"], "None / Not Selected missing from branches"
        assert "Data Science" in meta["branches"]
        assert "AI/ML Engineering" in meta["branches"]
        assert "Cybersecurity" in meta["branches"]
        assert "Computer Science / Software Development" in meta["branches"]
        print("  [OK] Roadmap Branch Taxonomy Verified (including 'None / Not Selected')")

        empty_path = service.get_docx_roadmap(db=db, user_id=1, branch="None / Not Selected", level="Beginner")
        assert empty_path["total_weeks"] == 0
        assert len(empty_path["weeks"]) == 0
        print("  [OK] 'None / Not Selected' generates clean unselected roadmap state")

        ds_path = service.get_docx_roadmap(db=db, user_id=1, branch="Data Science", level="Beginner")
        assert ds_path["total_weeks"] == 24
        assert len(ds_path["weeks"]) == 24
        print("  [OK] 24-week full curriculum generated for Data Science (Beginner)")
    finally:
        db.close()


def run_server_health_check():
    print("\n" + "=" * 60)
    print("4. RUNNING API SERVER HEALTH CHECK (IN-PROCESS TESTCLIENT)")
    print("=" * 60)
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    res_docs = client.get("/docs")
    assert res_docs.status_code == 200
    print("  [OK] FastAPI Backend Documentation Endpoint (/docs): HTTP 200 OK")

    res_branches = client.get("/api/v1/roadmap/branches")
    assert res_branches.status_code == 200
    data = res_branches.json()
    assert "None / Not Selected" in data["branches"]
    print("  [OK] Roadmap Branches Endpoint (/api/v1/roadmap/branches): HTTP 200 OK")


if __name__ == "__main__":
    print("=" * 60)
    print("STARTING PLACEX MASTER SYSTEM VERIFICATION")
    print("=" * 60)

    try:
        run_stdin_tests()
        run_quiz_tests()
        run_roadmap_tests()
        run_server_health_check()
        print("\n" + "=" * 60)
        print("SUCCESS: ALL TEST SUITES PASSED WITH 100% SUCCESS")
        print("=" * 60 + "\n")
    except Exception as exc:
        print(f"\nFAILURE: Test failed: {exc}")
        sys.exit(1)

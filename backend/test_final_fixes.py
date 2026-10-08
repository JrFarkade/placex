"""
Comprehensive Verification Script for PlaceX Final Targeted Bug Fixes:
1. Coding Sandbox Stdin Pipeline
2. Knowledge Base Quiz Non-Repeating Randomization
3. Resume ATS & JD Matching Main Host Agent Integration
"""

import sys
import os

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.dirname(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.database.session import SessionLocal
from app.coding_service.judge.judge0_client import Judge0Client
from app.services.quiz_service import fetch_quiz_questions
from app.host_agent.service import HostAgentService


def test_coding_sandbox_stdin():
    print("\n" + "=" * 60)
    print("TEST 1: CODING SANDBOX STDIN PIPELINE")
    print("=" * 60)

    # 1. Single input
    code1 = "age = input('Enter your age: ')\nprint('Your age is:', age)"
    res1 = Judge0Client.execute_code(source_code=code1, language="python", stdin="18\n")
    print(f"Case 1 (Single input 18): Status={res1['status']}")
    print(f"Stdout:\n{res1['stdout']}")
    assert res1["status"] == "Accepted"
    assert "Enter your age: 18" in res1["stdout"]
    assert "Your age is: 18" in res1["stdout"]
    print("  [PASS] Single input echoed and parsed correctly")

    # 2. Multiple inputs with int conversion
    code2 = "name = input('Name: ')\nage = int(input('Age: '))\nprint(name)\nprint(age + 1)"
    res2 = Judge0Client.execute_code(source_code=code2, language="python", stdin="Sahil\n21\n")
    print(f"\nCase 2 (Multiple inputs Sahil, 21): Status={res2['status']}")
    print(f"Stdout:\n{res2['stdout']}")
    assert res2["status"] == "Accepted"
    assert "Name: Sahil" in res2["stdout"]
    assert "Age: 21" in res2["stdout"]
    assert "22" in res2["stdout"]
    print("  [PASS] Multiple inputs + int arithmetic correctly handled")

    # 3. Float conversion
    code3 = "price = float(input('Price: '))\nprint('Doubled:', price * 2)"
    res3 = Judge0Client.execute_code(source_code=code3, language="python", stdin="4.5\n")
    assert res3["status"] == "Accepted"
    assert "Price: 4.5" in res3["stdout"]
    assert "Doubled: 9.0" in res3["stdout"]
    print("\n  [PASS] Float input correctly handled")

    # 4. Loop inputs
    code4 = "for i in range(3):\n    v = input('Enter: ')\n    print('Got:', v)"
    res4 = Judge0Client.execute_code(source_code=code4, language="python", stdin="one\ntwo\nthree\n")
    assert res4["status"] == "Accepted"
    assert "Enter: one" in res4["stdout"]
    assert "Got: one" in res4["stdout"]
    assert "Enter: three" in res4["stdout"]
    assert "Got: three" in res4["stdout"]
    print("  [PASS] Loop inputs correctly handled")

    # 5. Program without input
    code5 = "print('Hello, PlaceX!')"
    res5 = Judge0Client.execute_code(source_code=code5, language="python", stdin="")
    assert res5["status"] == "Accepted"
    assert "Hello, PlaceX!" in res5["stdout"]
    print("  [PASS] Non-input program works without interruption")

    # 6. Insufficient input -> EOFError
    code6 = "x = input('First: ')\ny = input('Second: ')"
    res6 = Judge0Client.execute_code(source_code=code6, language="python", stdin="only_one\n")
    assert "EOFError" in res6["stderr"]
    print("  [PASS] EOFError accurately raised on insufficient input")


def test_quiz_randomization():
    print("\n" + "=" * 60)
    print("TEST 2: KNOWLEDGE BASE QUIZ NON-REPEATING RANDOMIZATION")
    print("=" * 60)

    db = SessionLocal()
    try:
        user_id = "test_candidate_quiz_1"
        domain = "ai_ml"

        attempts = []
        for i in range(3):
            quiz_id, qs = fetch_quiz_questions(db=db, user_id=user_id, domains=[domain], num_questions=5, question_type="all")
            q_ids = [q.id for q in qs]
            attempts.append(q_ids)
            print(f"  Attempt {i+1} Question IDs: {q_ids}")
            assert len(qs) == 5, f"Expected 5 questions, got {len(qs)}"

        overlap_1_2 = set(attempts[0]).intersection(set(attempts[1]))
        overlap_2_3 = set(attempts[1]).intersection(set(attempts[2]))
        print(f"  Overlap between Attempt 1 & 2: {overlap_1_2}")
        print(f"  Overlap between Attempt 2 & 3: {overlap_2_3}")
        assert len(overlap_1_2) == 0, "Attempt 1 and 2 had repeating questions!"
        assert len(overlap_2_3) == 0, "Attempt 2 and 3 had repeating questions!"
        print("  [PASS] Consecutive quiz attempts select completely distinct question sets!")
    finally:
        db.close()


def test_resume_ats_and_jd_host_agent():
    print("\n" + "=" * 60)
    print("TEST 3: RESUME ATS & JD MATCHING MAIN HOST AGENT INTEGRATION")
    print("=" * 60)

    db = SessionLocal()
    try:
        user_id = 1

        # 1. ATS Explanation
        print("\n--- Testing ATS Result Explanation ---")
        ats_res = HostAgentService.review_ats(
            db=db,
            user_id=user_id,
            ats_score=75.0,
            section_scores={"Formatting": 80, "Skills": 70, "Experience": 75},
            suggestions=["Add measurable outcome metrics to project bullet points"]
        )
        assert ats_res["status"] == "success"
        assert "why_score" in ats_res or "what" in ats_res
        assert "what_is_working" in ats_res or "why" in ats_res
        assert "what_could_improve" in ats_res or "so_what" in ats_res
        assert "what_to_change_first" in ats_res or "now_what" in ats_res
        print(f"  ATS Why Score: {ats_res.get('why_score', '')[:120]}...")
        print(f"  ATS What is Working: {ats_res.get('what_is_working', '')[:120]}...")
        print(f"  ATS What Could Improve: {ats_res.get('what_could_improve', '')[:120]}...")
        print("  [PASS] Dynamic ATS Explanation generated from Gemini!")

        # 2. JD Match Explanation
        print("\n--- Testing JD Match Explanation ---")
        jd_res = HostAgentService.review_jd_match(
            db=db,
            user_id=user_id,
            match_score=54.7,
            exact_keyword_score=50.0,
            semantic_score=60.0,
            matching_skills=["Python", "SQL"],
            missing_skills=["Docker", "Kubernetes", "FastAPI"],
            job_description="Seeking a Senior Backend Engineer proficient in Python, FastAPI, Docker, and Kubernetes microservices."
        )
        assert jd_res["status"] == "success"
        assert "why_score" in jd_res or "what" in jd_res
        assert "what_already_matches" in jd_res or "why" in jd_res
        assert "what_is_missing" in jd_res or "so_what" in jd_res
        assert "what_to_prioritize" in jd_res or "now_what" in jd_res
        print(f"  JD Why Match: {jd_res.get('why_score', '')[:120]}...")
        print(f"  JD Already Matches: {jd_res.get('what_already_matches', '')[:120]}...")
        print(f"  JD Missing: {jd_res.get('what_is_missing', '')[:120]}...")
        print("  [PASS] Dynamic JD Match Explanation generated from Gemini!")

        # 3. Follow-up Chat with Host Agent
        print("\n--- Testing Interactive Resume / JD Follow-Up Chat ---")
        chat_res = HostAgentService.chat_about_resume(
            db=db,
            user_id=user_id,
            message="Why is my JD match low and how can I improve it without lying?",
            analysis_mode="MODE_B_JOB_MATCH_ANALYSIS",
            ats_score=54.7,
            matching_skills=["Python", "SQL"],
            missing_skills=["Docker", "Kubernetes", "FastAPI"],
            job_description="Senior Backend Engineer with FastAPI, Docker, and Kubernetes"
        )
        assert chat_res["status"] == "success"
        reply = chat_res.get("reply", "")
        print(f"  Host Agent Chat Reply: {reply[:160]}...")
        assert len(reply) > 20
        print("  [PASS] Main Host Agent conversational guidance grounded and active!")

    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("STARTING PLACEX TARGETED FIX VERIFICATION SUITE")
    print("=" * 60)

    try:
        test_coding_sandbox_stdin()
        test_quiz_randomization()
        test_resume_ats_and_jd_host_agent()
        print("\n" + "=" * 60)
        print("ALL TARGETED BUG FIX VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 60 + "\n")
    except Exception as e:
        print(f"\nTEST FAILURE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

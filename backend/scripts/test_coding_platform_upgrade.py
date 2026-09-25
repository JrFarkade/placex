import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine, Base
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.coding_service.services.coding_service import CodingService

def test_coding_platform_upgrade():
    print("=======================================================")
    print(" PLACEX CODING INTELLIGENCE PLATFORM UPGRADE TEST SUITE")
    print("=======================================================\n")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create fresh test student
        test_email = "coding.student@placex.ai"
        existing = UserRepository.get_by_email(db, test_email)
        if existing:
            db.delete(existing)
            db.commit()

        student = UserRepository.create_user(db, UserCreate(
            email=test_email,
            password="SecurePassword123!",
            full_name="Morgan Stanley",
            role="student"
        ))

        # 1. TEST 1: Question Catalog Retrieval
        qs = CodingService.get_questions(db)
        assert len(qs) >= 4
        print(f"[+] TEST 1 PASSED: Retrieved catalog of {len(qs)} normalized coding questions.")

        # 2. TEST 2: Role-Based Question Recommendation (Data Analyst Target)
        prof = UserRepository.get_profile(db, student.id)
        prof.target_role = "Data Analyst"
        db.commit()

        rec = CodingService.get_personalized_recommendation(db, student.id)
        assert "SQL" in rec["recommended_question"]["title"] or "Pandas" in rec["recommended_question"]["title"]
        print(f"[+] TEST 2 PASSED: Recommended question '{rec['recommended_question']['title']}' for Data Analyst target.")

        # 3. TEST 3: Question Details with Starter Code, Hints & Editorial
        q_detail = CodingService.get_question_by_id(db, 1)
        assert "starter_code" in q_detail
        assert "python" in q_detail["starter_code"]
        assert len(q_detail["hints"]) >= 2
        print(f"[+] TEST 3 PASSED: Question #{q_detail['id']} ({q_detail['title']}) details include starter code & hints.")

        # 4. TEST 4: Run Code vs Submit Solution
        py_code = q_detail["starter_code"]["python"]
        run_res = CodingService.run_code(db, student.id, 1, py_code, "python", custom_input="nums = [2,7,11,15], target = 9")
        assert run_res["status"] == "Accepted"

        sub_res = CodingService.submit_solution(db, student.id, 1, py_code, "python")
        assert sub_res["status"] == "Accepted"
        assert sub_res["passed_testcases"] > 0
        print(f"[+] TEST 4 PASSED: Executed Run Code & Submit Solution successfully with Judge0 + AST analyzer.")

        # 5. TEST 5: Submission History
        subs = CodingService.get_submission_history(db, student.id)
        assert len(subs) >= 1
        assert subs[0]["status"] == "Accepted"
        print(f"[+] TEST 5 PASSED: Submission history logged cleanly (Submission ID: {subs[0]['id']}).")

    finally:
        db.close()

    print("\n=======================================================")
    print(" ALL CODING PLATFORM UPGRADE TESTS PASSED 100% CLEAN")
    print("=======================================================")

if __name__ == "__main__":
    test_coding_platform_upgrade()

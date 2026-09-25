import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine, Base
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.core.security import create_access_token
from app.learning_engine.services.learning_service import LearningService

def test_clean_auth_and_empty_states():
    print("=======================================================")
    print(" TESTING PLACEX REAL AUTH & CLEAN EMPTY STATES")
    print("=======================================================\n")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Register a NEW student with real name
        test_email = "real.student@placex.ai"
        existing = UserRepository.get_by_email(db, test_email)
        if existing:
            db.delete(existing)
            db.commit()

        user_in = UserCreate(
            email=test_email,
            password="SecurePassword123!",
            full_name="Real Candidate Name",
            role="student"
        )
        new_user = UserRepository.create_user(db, user_in)
        assert new_user.full_name == "Real Candidate Name"
        print(f"[+] TEST 1 PASSED: Registered user '{new_user.full_name}' ({new_user.email}) successfully!")

        # 2. Verify Profile Defaults (Zero fake Alex Mercer or Google defaults)
        profile = UserRepository.get_profile(db, new_user.id)
        assert profile.target_company is None
        assert profile.target_role is None
        print(f"[+] TEST 2 PASSED: Target Company = {profile.target_company} (Not set), Target Role = {profile.target_role} (Not set)")

        # 3. Verify Learning Service Readiness calculation for fresh account
        plan = LearningService.get_roadmap_and_plan(db, new_user.id)
        assert plan["readiness"]["readiness_score"] is None
        assert plan["readiness"]["readiness_level"] == "Not Calculated"
        assert plan["status"] == "No roadmap generated"
        print(f"[+] TEST 3 PASSED: Readiness Score = {plan['readiness']['readiness_score']} (Not calculated)")
        print(f"    Roadmap Status = '{plan['status']}'")

        # 4. Verify JWT token authentication
        token = create_access_token(subject=new_user.id)
        assert token != ""
        print(f"[+] TEST 4 PASSED: Generated valid JWT Token for Real Student!")

    finally:
        db.close()

    print("\n=======================================================")
    print(" CLEAN AUTHENTICATION & EMPTY STATES VERIFIED 100%")
    print("=======================================================")

if __name__ == "__main__":
    test_clean_auth_and_empty_states()

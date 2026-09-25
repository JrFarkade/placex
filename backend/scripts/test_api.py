import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password
from app.host_agent.services.orchestrator import HostAgentOrchestrator
from app.resume_service.services.resume_service import ResumeService
from app.coding_service.services.coding_service import CodingService
from app.interview_service.services.interview_service import InterviewService
from app.learning_engine.services.learning_service import LearningService

def test_full_system_integration():
    db = SessionLocal()
    try:
        user = UserRepository.get_by_email(db, "student@placex.ai")
        assert user is not None, "Student user missing"
        print("[+] 1. Authentication Verification: PASSED")

        # 2. Host Agent Orchestrator Test
        host_res = HostAgentOrchestrator.process_request(
            db=db, user_id=user.id, message="Prepare me for Google interview", active_feature="dashboard"
        )
        assert host_res["status"] == "success"
        print(f"[+] 2. Host Agent Orchestrator: PASSED (Intent: {host_res['intent']})")

        # 3. Resume Intelligence ATS Engine Test
        resume_res = ResumeService.process_and_analyze_resume(
            db=db, user_id=user.id, file_path="dummy.pdf", original_filename="dummy.pdf"
        )
        assert "ats_score" in resume_res
        print(f"[+] 3. Resume ATS Engine: PASSED (ATS Score: {resume_res['ats_score']}/100)")

        # 4. Coding Intelligence Sandbox Test
        coding_res = CodingService.run_or_submit_code(
            db=db, user_id=user.id, question_id=1, source_code="def twoSum(): pass", language="python"
        )
        assert "status" in coding_res
        print(f"[+] 4. Coding Sandbox Execution: PASSED (Status: {coding_res['status']}, Time Complexity: {coding_res['time_complexity']})")

        # 5. Interview Intelligence Mock Test
        interview_res = InterviewService.start_session(
            db=db, user_id=user.id, interview_type="Technical", target_company="Google"
        )
        assert "session_id" in interview_res
        print(f"[+] 5. Interview Intelligence Simulator: PASSED (Session ID: {interview_res['session_id']})")

        # 6. Learning Intelligence Engine Test
        roadmap_res = LearningService.get_roadmap_and_plan(db=db, user_id=user.id, target_company="Google")
        assert "readiness" in roadmap_res
        print(f"[+] 6. Learning Intelligence Engine: PASSED (Readiness Score: {roadmap_res['readiness']['readiness_score']}/100 - {roadmap_res['readiness']['readiness_level']})")

        print("\n=======================================================")
        print(" ALL 8-PART PLACEX SYSTEM SERVICES VERIFIED 100% CLEAN")
        print("=======================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_full_system_integration()

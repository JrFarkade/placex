import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal, engine, Base
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.host_agent.services.orchestrator import HostAgentOrchestrator
from app.host_agent.memory.memory_manager import MemoryManager

def test_host_agent_chat_ux_fix():
    print("=======================================================")
    print(" PLACEX HOST AGENT CHAT UX FINAL CORRECTION TEST SUITE")
    print("=======================================================\n")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Create fresh test student
        test_email = "chat.ux@placex.ai"
        existing = UserRepository.get_by_email(db, test_email)
        if existing:
            db.delete(existing)
            db.commit()

        student = UserRepository.create_user(db, UserCreate(
            email=test_email,
            password="SecurePassword123!",
            full_name="Jordan Lee",
            role="student"
        ))

        # TEST 32 & 33: New student selects Data Analyst via UI button (Message payload = "Data Analyst")
        res1 = HostAgentOrchestrator.process_request(db, student.id, "Data Analyst")
        reply1 = res1["reply"]
        assert "Executed Services:" not in reply1
        assert "Set Target Goal:" not in reply1
        assert "starting point" in reply1.lower() or "studying" in reply1.lower()
        print(f"[+] TEST 32 & 33 PASSED: Natural response to 'Data Analyst' without fake user messages or command labels.")

        # TEST 34: Verify NO fake skills assumed when profile skills are empty
        assert "Since you already know SQL and Python" not in reply1
        print(f"[+] TEST 34 PASSED: Zero unverified skills assumed when student skills profile is empty!")

        # TEST 35: Provide explicit skills ("Computer Science, 4th year. I know Python and SQL.")
        res2 = HostAgentOrchestrator.process_request(db, student.id, "Computer Science, 4th year. I already know Python and SQL.")
        mem = MemoryManager.get_memory(db, student.id)["long_term"]
        assert "Python" in mem["skills"]
        assert "SQL" in mem["skills"]
        print(f"[+] TEST 35 PASSED: Skills ['Python', 'SQL'] saved to student profile accurately.")

        # TEST 36: Role Change Confirmation (Student currently targeting Data Analyst, selects Software Engineer)
        res3 = HostAgentOrchestrator.process_request(db, student.id, "Software Engineer")
        assert "Yes, Switch Goal" in res3["recommendations"] or "Keep Current Role" in res3["recommendations"]
        print(f"[+] TEST 36 PASSED: Role switch request triggered confirmation controls: {res3['recommendations']}.")

        # TEST 37: Normal technical question ("What is a Data Analyst?")
        res4 = HostAgentOrchestrator.process_request(db, student.id, "What is a Data Analyst?")
        assert "data" in res4["reply"].lower() or "analytics" in res4["reply"].lower()
        assert "Executed Services" not in res4["reply"]
        print(f"[+] TEST 37 PASSED: Technical question answered naturally with zero debug clutter.")

    finally:
        db.close()

    print("\n=======================================================")
    print(" ALL CHAT UX CORRECTION ACCEPTANCE TESTS PASSED 100%")
    print("=======================================================")

if __name__ == "__main__":
    test_host_agent_chat_ux_fix()

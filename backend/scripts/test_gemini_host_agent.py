import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.host_agent.prompt_manager.prompt_manager import PromptManager
from app.host_agent.services.gemini_service import GeminiService

def test_gemini_host_agent_integration():
    print("=======================================================")
    print(" TESTING PLACEX GEMINI HOST AGENT INTEGRATION")
    print("=======================================================\n")

    # 1. System Prompt Verification
    sys_prompt = PromptManager.get_host_prompt()
    assert "Onboard first-time logged-in students" in sys_prompt
    assert "Mermaid.js syntax" in sys_prompt
    print("[+] PromptManager System Prompt Verified Cleanly!")

    # 2. Config & API Key Check
    print(f"[+] Gemini Config Model: {settings.GEMINI_MODEL}")
    assert settings.GEMINI_API_KEY != ""
    print("[+] Server-Side GEMINI_API_KEY present in settings!")

    # 3. Gemini Response Generation Test
    student_name = "Rahul Sharma"
    long_term_memory = {
        "field_of_study": "Computer Science & Engineering",
        "academic_year": "3rd Year",
        "skills": ["Python", "SQL"],
        "target_role": "Software Development Engineer (SDE)"
    }
    short_term_context = {"current_feature": "dashboard"}

    res = GeminiService.generate_response(
        user_message="Hello, I am looking for a roadmap to become an SDE.",
        student_name=student_name,
        long_term_memory=long_term_memory,
        short_term_context=short_term_context
    )

    assert res["reply"] != ""
    assert res["provider"] == "google_gemini"
    print(f"[+] Gemini LLM Response Received!")
    print(f"    Reply Preview: {res['reply'][:120]}...")
    if res.get("mermaid_code"):
        print(f"    Mermaid Flowchart Code: {res['mermaid_code']}")

    print("\n=======================================================")
    print(" GEMINI HOST AGENT INTEGRATION TEST PASSED 100%")
    print("=======================================================")

if __name__ == "__main__":
    test_gemini_host_agent_integration()

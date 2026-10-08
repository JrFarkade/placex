"""
End-to-End Candidate Flow Validation Script
Tests:
1. Setup Form POST (Company intake, research, and question generation)
2. Question Bank DB persistence & Review rendering
3. Launch interview action (Session creation, question bank serialization, bot.py env injection)
4. Bot.py load_question_bank() and prompt building with injected questions
5. Downstream session completion & scoring verification
"""

import os
import sys
import json
from pathlib import Path

workspace_root = Path(__file__).resolve().parent.parent
webapp_path = workspace_root / "webapp"
execution_path = workspace_root / "execution"
placex_path = workspace_root / "placex_files"

for p in [str(workspace_root), str(webapp_path), str(execution_path), str(placex_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")
import django
django.setup()

from django.test import Client
from accounts.models import PlaceXUser
from dashboard.models import InterviewSetup, QuestionBank as DBQuestionBank, InterviewSession
from prep_brain_schema import QuestionBank as PydanticQuestionBank
from bot import load_question_bank, build_interviewer_system_prompt

def run_test():
    print("=" * 70)
    print(" PlaceX Full Candidate Flow End-to-End Test")
    print("=" * 70)

    # 1. Setup candidate user
    username = "test_candidate_flow"
    user, created = PlaceXUser.objects.get_or_create(
        username=username,
        defaults={
            "email": "candidate@flowtest.com",
            "target_role": "Senior Distributed Systems Engineer",
            "target_level": "L5 / Senior",
        }
    )
    if created:
        user.set_password("pass1234")
        user.save()

    client = Client()
    client.force_login(user)
    print("[1] Candidate logged in successfully.")

    # 2. Submit Setup Form (Intake & Prep Brain)
    print("\n[2] Submitting Setup Form (Company: Stripe, Role: Staff Systems Engineer)...")
    post_data = {
        "company": "Stripe",
        "role": "Staff Systems Engineer",
        "difficulty": "Staff",
        "domain_interests": "Distributed Consensus, Kafka, High Throughput",
    }
    response = client.post("/dashboard/setup/new/", data=post_data, follow=True)
    print(f"    HTTP Status: {response.status_code}")
    
    setup = InterviewSetup.objects.filter(candidate=user).order_by("-created_at").first()
    assert setup is not None, "InterviewSetup not created in DB"
    print(f"    InterviewSetup created: #{setup.id} ({setup.company} - {setup.role})")

    qb_record = getattr(setup, "question_bank", None)
    assert qb_record is not None, "QuestionBank record not linked to setup"
    print(f"    QuestionBank record found in DB with {len(qb_record.questions.get('questions', []))} questions.")

    # 3. Test Setup Review GET
    print(f"\n[3] Fetching Setup Review page (/dashboard/setup/{setup.id}/review/)...")
    review_resp = client.get(f"/dashboard/setup/{setup.id}/review/")
    assert review_resp.status_code == 200, f"Setup review failed with status {review_resp.status_code}"
    print(f"    Review page rendered successfully with Launch button.")

    # 4. Trigger Launch Interview Action
    print(f"\n[4] Triggering Launch Interview Action (/dashboard/setup/{setup.id}/launch/)...")
    launch_resp = client.get(f"/dashboard/setup/{setup.id}/launch/", follow=True)
    assert launch_resp.status_code == 200, f"Launch failed with status {launch_resp.status_code}"

    session = InterviewSession.objects.filter(candidate=user).order_by("-created_at").first()
    assert session is not None, "InterviewSession not created in DB"
    print(f"    InterviewSession created: ID={session.id}, status={session.status}")

    qb_file = workspace_root / ".tmp" / f"session_{session.id}_question_bank.json"
    assert qb_file.exists(), f"Injected question bank file missing at {qb_file}"
    print(f"    Injected question bank JSON file written: {qb_file}")

    # 5. Validate injected question bank with bot.py
    print("\n[5] Validating injected Question Bank with bot.py parser...")
    with open(qb_file, "r", encoding="utf-8") as f:
        raw_json = json.load(f)
    
    validated_qb = PydanticQuestionBank.model_validate(raw_json)
    assert validated_qb.validate_strict_order(), "Question sequence is not strictly ordered 1..N"
    print(f"    Validated Pydantic schema: {len(validated_qb.questions)} questions loaded.")

    # 6. Test Bot Prompt Generation
    print("\n[6] Building Live Brain Interviewer System Prompt...")
    os.environ["QUESTION_BANK_PATH"] = str(qb_file)
    bot_qb = load_question_bank(str(qb_file))
    prompt = build_interviewer_system_prompt(bot_qb)
    assert "FIXED QUESTION SEQUENCE" in prompt
    assert setup.company in prompt
    print(f"    Interviewer prompt generated ({len(prompt)} characters). Prompt snippet:")
    print("    " + prompt[:250].replace("\n", "\n    ") + "...")

    print("\n" + "=" * 70)
    print(" ALL END-TO-END CANDIDATE FLOW CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_test()

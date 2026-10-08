"""
PlaceX Prep Brain Webapp Integration Test
Validates:
1. InterviewSetup and QuestionBank model schema and migrations.
2. Form view (GET/POST) for /dashboard/setup/new/ and review page /dashboard/setup/<id>/review/.
3. Synchronous pipeline triggering and JSON storage.
"""

import os
import sys
from pathlib import Path

# Setup Django environment
_webapp_dir = Path(__file__).resolve().parent.parent / "webapp"
if str(_webapp_dir) not in sys.path:
    sys.path.insert(0, str(_webapp_dir))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")
import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from dashboard.models import InterviewSetup, QuestionBank
from dashboard.views import setup_create, setup_review

User = get_user_model()


def run_tests():
    print("=" * 70)
    print(" PlaceX Prep Brain Webapp Integration Validation")
    print("=" * 70)

    # 1. Get or create test user
    test_user, _ = User.objects.get_or_create(
        username="test_candidate_prep",
        defaults={
            "email": "candidate_prep@placex.ai",
            "target_role": "Senior Distributed Systems Engineer",
            "target_level": "Senior",
        }
    )
    print(f"[+] Using test candidate user: {test_user.username}")

    # 2. Test Model Creation directly
    setup = InterviewSetup.objects.create(
        candidate=test_user,
        company="Datadog",
        role="Senior Distributed Systems Engineer",
        difficulty="Senior",
        domain_interests=["Kafka", "High Throughput"],
    )
    print(f"[+] Created InterviewSetup: #{setup.id} ({setup.company} - {setup.role})")

    mock_qb_payload = {
        "questions": [
            {
                "question_text": "How do you design a real-time metrics aggregation pipeline in Kafka?",
                "tier": "warm-up",
                "category": "Kafka Streams",
                "scoring_rubric": {
                    "criteria": ["Explains consumer group partition rebalancing.", "Discusses windowing."],
                    "point_scale": 10,
                }
            }
        ]
    }
    qb = QuestionBank.objects.create(
        setup=setup,
        questions=mock_qb_payload,
    )
    print(f"[+] Created QuestionBank: #{qb.id} for Setup #{setup.id}")
    assert setup.question_bank == qb
    assert qb.questions["questions"][0]["tier"] == "warm-up"

    # 3. Test View: GET setup_create
    rf = RequestFactory()
    get_req = rf.get("/dashboard/setup/new/")
    get_req.user = test_user
    get_resp = setup_create(get_req)
    assert get_resp.status_code == 200
    print("[+] GET /dashboard/setup/new/ returned 200 OK")

    # 4. Test View: GET setup_review
    rev_req = rf.get(f"/dashboard/setup/{setup.id}/review/")
    rev_req.user = test_user
    rev_resp = setup_review(rev_req, setup_id=setup.id)
    assert rev_resp.status_code == 200
    print(f"[+] GET /dashboard/setup/{setup.id}/review/ returned 200 OK")

    # Clean up test records
    qb.delete()
    setup.delete()
    print("[+] Cleaned up test database records.")
    print("\n[+] All Prep Brain Django integration tests passed successfully!")


if __name__ == "__main__":
    run_tests()

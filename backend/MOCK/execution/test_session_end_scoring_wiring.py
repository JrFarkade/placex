"""
PlaceX Verification Suite — Automated Session-End Scoring Brain Trigger & Record Persistence
Validates:
1. Live Brain SessionTranscriptCollector captures turns and signals.
2. Automatic session completion triggers the Scoring & Feedback Brain.
3. Scoring report JSON artifact is created on disk (.tmp/).
4. Django InterviewSession database record is updated automatically:
   - status: 'evaluated'
   - overall_score: populated float (0-10)
   - hire_recommendation: populated string
   - transcript_payload: saved with turns and signals
   - evaluation_report_payload: saved with rubrics, mistakes, and summary
   - completed_at: timestamp populated
"""

import json
import os
import sys
import unittest
import uuid
from pathlib import Path

# Setup paths
workspace_root = Path(__file__).resolve().parent.parent
execution_path = workspace_root / "execution"
placex_files_path = workspace_root / "placex_files"
webapp_path = workspace_root / "webapp"

for p in [str(execution_path), str(placex_files_path), str(webapp_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")

import django
django.setup()

from accounts.models import PlaceXUser
from dashboard.models import CandidateAssignment, InterviewSession
from prep_brain_schema import (
    QuestionBank,
    QuestionItem,
    QuestionTier,
    PrepBrainMetadata,
    ScoringRubric,
    RubricCriterion,
)
from score_transcript import score_and_record_session, update_django_session_record
from bot import SessionTranscriptCollector


class TestSessionEndScoringWiring(unittest.TestCase):

    def setUp(self):
        self.user = PlaceXUser.objects.create_user(
            username="candidate_auto_scoring",
            email="candidate_auto@example.com",
            password="testpassword123",
        )
        self.assignment = CandidateAssignment.objects.create(
            candidate=self.user,
            company_name="Stripe",
            company_domain="stripe.com",
            role_title="Senior Software Engineer",
            target_level="L5 / Senior",
            status="in_progress",
        )
        self.session = InterviewSession.objects.create(
            candidate=self.user,
            assignment=self.assignment,
            company_name="Stripe",
            role_title="Senior Software Engineer",
            status="scheduled",
        )

        # Mock question bank
        self.question_bank = QuestionBank(
            session_id=str(self.session.id),
            metadata=PrepBrainMetadata(
                company_name="Stripe",
                company_domain="stripe.com",
                role_title="Senior Software Engineer",
                target_level="L5 / Senior",
                tech_stack_detected=["Python", "Distributed Systems", "PostgreSQL"],
                domain_focus=["Payments", "High Availability"],
            ),
            questions=[
                QuestionItem(
                    id="q1_idempotency",
                    index=1,
                    tier=QuestionTier.CORE_TECHNICAL,
                    topic="Distributed Idempotency & Exactly-Once Semantics",
                    primary_prompt="How do you architect payment webhook processing to guarantee idempotency during network partitions?",
                    context_background="Evaluates distributed transaction consistency and database unique constraints.",
                    scoring_rubric=ScoringRubric(
                        max_points=10,
                        key_phrases_expected=["idempotency key", "redis lock", "atomic transaction", "database constraint"],
                        anti_patterns=["in-memory non-persistent deduplication", "ignoring retry concurrency"],
                        criteria=[
                            RubricCriterion(
                                dimension="Concurrency Control",
                                weight=0.6,
                                poor_0_3="Fails to account for concurrent duplicate requests.",
                                good_4_7="Uses unique database constraints or distributed lock with TTL.",
                                expert_8_10="Combines database unique constraints, atomic state machine transitions, and dead-letter queues.",
                            ),
                            RubricCriterion(
                                dimension="Failure Recovery",
                                weight=0.4,
                                poor_0_3="No replay mechanism.",
                                good_4_7="Standard exponential backoff.",
                                expert_8_10="Exponential backoff with jitter and idempotency key caching.",
                            ),
                        ],
                    ),
                )
            ],
        )

    def tearDown(self):
        InterviewSession.objects.filter(candidate=self.user).delete()
        CandidateAssignment.objects.filter(candidate=self.user).delete()
        PlaceXUser.objects.filter(id=self.user.id).delete()


    def test_session_collector_and_auto_scoring_pipeline(self):
        """Verify full lifecycle from transcript capture to DB record update."""
        session_id_str = str(self.session.id)
        collector = SessionTranscriptCollector(
            session_id=session_id_str,
            question_bank=self.question_bank,
        )

        # 1. Simulate Live Brain interview turns
        collector.record_turn(
            speaker="interviewer",
            text="Welcome! Let's start with our first question: How do you architect payment webhook processing to guarantee idempotency?",
            question_id="q1_idempotency",
        )
        collector.record_signal({
            "type": "prosody_speaking_rate",
            "turn": 1,
            "words_per_minute": 142.5,
        })
        collector.record_signal({
            "type": "visual_gaze_stability",
            "turn": 1,
            "gaze_centered_percentage": 95.0,
        })

        collector.record_turn(
            speaker="candidate",
            text=(
                "At Stripe scale, to guarantee idempotency we attach a unique idempotency key to every payment webhook request. "
                "We utilize an atomic transaction with a database constraint on the payment ID, combined with a Redis lock "
                "to handle high-concurrency races. If a retry occurs with the same key, we return the cached response."
            ),
            question_id="q1_idempotency",
        )
        collector.record_signal({
            "type": "filler_words",
            "turn": 2,
            "count": 0,
            "words": [],
        })

        # 2. Trigger automatic scoring (dry_run=True for deterministic test execution)
        report = collector.trigger_scoring(dry_run=True)

        self.assertIsNotNone(report, "Scoring report should be returned")
        self.assertEqual(report.session_id, session_id_str)
        self.assertGreater(report.overall_evaluation.total_score, 0.0)
        self.assertIn(
            report.overall_evaluation.hire_recommendation.value,
            ["Strong Hire", "Hire", "Leaning Hire", "Leaning No Hire", "No Hire"],
        )

        # 3. Verify output JSON was written to disk (.tmp/ output contract)
        expected_json_file = workspace_root / ".tmp" / f"session_{session_id_str}_scoring_report.json"
        self.assertTrue(expected_json_file.exists(), f"Output JSON must exist at: {expected_json_file}")

        with open(expected_json_file, "r", encoding="utf-8") as f:
            saved_data = json.load(f)
        self.assertEqual(saved_data["session_id"], session_id_str)
        self.assertIn("overall_evaluation", saved_data)
        self.assertIn("question_evaluations", saved_data)

        # 4. In decoupled architecture, webapp service layer receives report and persists to DB
        success = update_django_session_record(session_id_str, report, collector.build_payload())
        self.assertTrue(success, "Webapp persistence helper must successfully update DB")

        # 5. Verify Django DB record was updated by webapp layer
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "evaluated", "Session status must be updated to 'evaluated'")
        self.assertIsNotNone(self.session.overall_score, "Overall score must be populated")
        self.assertAlmostEqual(self.session.overall_score, report.overall_evaluation.total_score, places=2)
        self.assertEqual(self.session.hire_recommendation, report.overall_evaluation.hire_recommendation.value)
        self.assertIsNotNone(self.session.completed_at, "completed_at must be populated")
        self.assertIsNotNone(self.session.transcript_payload, "transcript_payload must be saved")
        self.assertEqual(len(self.session.transcript_payload["transcript_turns"]), 2)
        self.assertEqual(len(self.session.transcript_payload["behavioral_signals_captured"]), 3)
        self.assertIsNotNone(self.session.evaluation_report_payload, "evaluation_report_payload must be saved")
        self.assertIn("executive_summary", self.session.evaluation_report_payload["overall_evaluation"])

        print("\n[+] Verification PASSED: Decoupled session-end scoring trigger, disk JSON export, and webapp DB update verified successfully.")


if __name__ == "__main__":
    unittest.main()

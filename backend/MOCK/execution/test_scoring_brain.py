"""
PlaceX Scoring & Feedback Brain — Test Suite
Validates the data schema, rubric criterion calculation, mistake callouts,
improvement suggestions, and CLI execution harness.
"""

import json
import os
import sys
import unittest
from pathlib import Path

# Ensure execution path is resolved
workspace_root = Path(__file__).resolve().parent.parent
execution_path = workspace_root / "execution"
if str(execution_path) not in sys.path:
    sys.path.insert(0, str(execution_path))

from scoring_brain_schema import (
    ScoringReport,
    ScoringReportMetadata,
    OverallEvaluation,
    QuestionEvaluation,
    CriterionEvaluation,
    MistakeCallout,
    MistakeSeverity,
    ImprovementSuggestion,
    BehavioralSummaryFeedback,
    HireRecommendation,
)
from prep_brain_schema import (
    QuestionBank,
    QuestionItem,
    QuestionTier,
    PrepBrainMetadata,
    ScoringRubric,
    RubricCriterion,
)
from score_transcript import evaluate_transcript_dry_run


class TestScoringBrain(unittest.TestCase):

    def setUp(self):
        self.mock_metadata = PrepBrainMetadata(
            company_name="Stripe",
            company_domain="stripe.com",
            role_title="Senior Software Engineer",
            target_level="L5 / Senior",
            tech_stack_detected=["Python", "Kafka", "PostgreSQL", "Redis"],
            domain_focus=["Distributed Systems"],
        )
        self.mock_rubric = ScoringRubric(
            max_points=10,
            criteria=[
                RubricCriterion(
                    dimension="Architectural Clarity",
                    weight=0.5,
                    poor_0_3="Vague components",
                    good_4_7="Coherent flow",
                    expert_8_10="Precise breakdown",
                ),
                RubricCriterion(
                    dimension="Tradeoff Articulation",
                    weight=0.5,
                    poor_0_3="Ignores tradeoffs",
                    good_4_7="Mentions tradeoffs",
                    expert_8_10="Deep insight into bottlenecks",
                ),
            ],
            key_phrases_expected=["throughput", "bottleneck", "caching", "idempotency"],
            anti_patterns=["zero tradeoff", "single server only"],
        )
        self.mock_questions = [
            QuestionItem(
                id="q1_warmup",
                index=1,
                tier=QuestionTier.WARMUP,
                topic="Architecture",
                primary_prompt="Tell me about your highest scale system.",
                context_background="Calibrates seniority",
                allowed_micro_probes=["What was the bottleneck?"],
                scoring_rubric=self.mock_rubric,
            )
        ]
        self.mock_qb = QuestionBank(
            session_id="test-session-001",
            metadata=self.mock_metadata,
            questions=self.mock_questions,
        )
        self.mock_transcript = {
            "session_id": "test-session-001",
            "transcript_turns": [
                {
                    "turn_index": 1,
                    "speaker": "interviewer",
                    "question_id": "q1_warmup",
                    "text": "Tell me about your highest scale system.",
                },
                {
                    "turn_index": 2,
                    "speaker": "candidate",
                    "question_id": "q1_warmup",
                    "text": "I designed an event ingestion system with high throughput, resolving the database bottleneck by adding caching and batch idempotency keys.",
                },
            ],
            "behavioral_signals_captured": [
                {
                    "type": "prosody_speaking_rate",
                    "turn": 1,
                    "words_per_minute": 145.0,
                }
            ],
        }

    def test_01_scoring_report_schema_validation(self):
        """Verify ScoringReport model instantiates and validates all nested structures."""
        crit = CriterionEvaluation(
            dimension="Clarity",
            weight=1.0,
            score_0_10=8.5,
            rationale="Well structured explanation",
        )
        q_eval = QuestionEvaluation(
            question_id="q1_warmup",
            index=1,
            tier="warmup",
            topic="Architecture",
            score=8.5,
            max_points=10.0,
            criteria_breakdown=[crit],
            key_phrases_detected=["throughput", "caching"],
            key_phrases_missed=["sharding"],
        )
        overall = OverallEvaluation(
            total_score=8.5,
            max_possible_score=10.0,
            percentage=85.0,
            hire_recommendation=HireRecommendation.STRONG_HIRE,
            executive_summary="Candidate demonstrated solid mastery.",
        )
        report = ScoringReport(
            session_id="test-123",
            metadata=ScoringReportMetadata(
                company_name="Acme",
                company_domain="acme.com",
                role_title="Backend Dev",
            ),
            overall_evaluation=overall,
            question_evaluations=[q_eval],
            mistake_callouts=[
                MistakeCallout(
                    question_id="q1_warmup",
                    severity=MistakeSeverity.MINOR,
                    title="Minor Gaps",
                    description="Omitted DB failover steps",
                )
            ],
            improvement_suggestions=[
                ImprovementSuggestion(
                    topic="Failover",
                    suggestion="Study active-passive failover mechanisms.",
                    impact="Ensures high availability.",
                    recommended_study="RFC 1234",
                )
            ],
            behavioral_summary=BehavioralSummaryFeedback(
                speaking_pace_wpm=140.0,
                pace_assessment="Optimal",
                pause_behavior="Deliberate thinking pauses",
                communication_clarity="Articulate",
            ),
        )

        json_str = report.model_dump_json()
        data = json.loads(json_str)
        self.assertEqual(data["session_id"], "test-123")
        self.assertEqual(data["overall_evaluation"]["hire_recommendation"], "Strong Hire")
        self.assertEqual(len(data["question_evaluations"]), 1)
        self.assertEqual(data["question_evaluations"][0]["score"], 8.5)

    def test_02_weighted_score_calculation(self):
        """Verify weighted composite score calculation equals criteria sum."""
        c1 = CriterionEvaluation(dimension="D1", weight=0.6, score_0_10=8.0, rationale="R1")
        c2 = CriterionEvaluation(dimension="D2", weight=0.4, score_0_10=6.0, rationale="R2")
        q_eval = QuestionEvaluation(
            question_id="q1",
            index=1,
            tier="core_technical",
            topic="Consistency",
            score=7.2,
            max_points=10.0,
            criteria_breakdown=[c1, c2],
        )
        calculated = q_eval.calculate_weighted_score()
        self.assertAlmostEqual(calculated, 0.6 * 8.0 + 0.4 * 6.0, places=2)
        self.assertAlmostEqual(calculated, 7.2, places=2)

    def test_03_dry_run_evaluation(self):
        """Verify evaluate_transcript_dry_run produces a complete calibrated report."""
        report = evaluate_transcript_dry_run(self.mock_transcript, self.mock_qb)
        self.assertIsInstance(report, ScoringReport)
        self.assertEqual(report.metadata.company_name, "Stripe")
        self.assertEqual(len(report.question_evaluations), 1)

        q1_eval = report.question_evaluations[0]
        self.assertEqual(q1_eval.question_id, "q1_warmup")
        self.assertGreater(len(q1_eval.key_phrases_detected), 0)
        self.assertGreaterEqual(q1_eval.score, 7.0)

        # Check behavioral summary
        self.assertIsNotNone(report.behavioral_summary)
        self.assertEqual(report.behavioral_summary.speaking_pace_wpm, 145.0)

        # Check improvement suggestions
        self.assertGreaterEqual(len(report.improvement_suggestions), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)

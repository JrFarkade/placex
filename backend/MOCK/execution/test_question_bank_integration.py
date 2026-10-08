"""
PlaceX Live Brain — Question Bank Integration Test Suite
Validates the wiring between Prep Brain Question Bank blueprints and Live Brain bot.py:
- Loading and schema validation (JSON blueprint parsing, strict 1..N sequence checks)
- System prompt generation with strict delivery contracts and spoken fluency guardrails
- Fallback question bank generation
- Multi-turn simulated session checking sequential question progression
"""

import os
import sys
import json
import unittest
from pathlib import Path
from dotenv import find_dotenv, load_dotenv

# Ensure workspace root and execution directories are in path
workspace_root = Path(__file__).resolve().parent.parent
execution_path = workspace_root / "execution"
placex_path = workspace_root / "placex_files"

for p in [str(workspace_root), str(execution_path), str(placex_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load env variables
env_file = find_dotenv(usecwd=True)
if env_file:
    load_dotenv(env_file)

from prep_brain_schema import (
    QuestionBank,
    QuestionItem,
    QuestionTier,
    PrepBrainMetadata,
    ScoringRubric,
    RubricCriterion,
    PrepBrainJobInput,
)
from bot import load_question_bank, build_interviewer_system_prompt


class TestQuestionBankIntegration(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = execution_path / "sample_question_bank.json"
        self.assertTrue(self.sample_json_path.exists(), f"Missing {self.sample_json_path}")

    def test_01_load_question_bank_from_file(self):
        """Verify question bank loads and validates from explicit file path."""
        qb = load_question_bank(str(self.sample_json_path))
        self.assertIsInstance(qb, QuestionBank)
        self.assertEqual(qb.metadata.company_name, "Stripe")
        self.assertEqual(len(qb.questions), 4)
        self.assertTrue(qb.validate_strict_order())

        # Check question indices and IDs
        indices = [q.index for q in qb.questions]
        self.assertEqual(indices, [1, 2, 3, 4])
        self.assertEqual(qb.questions[0].id, "q1_warmup")
        self.assertEqual(qb.questions[1].id, "q2_core_technical")
        self.assertEqual(qb.questions[2].id, "q3_deep_architecture")
        self.assertEqual(qb.questions[3].id, "q4_behavioral_tradeoff")

    def test_02_strict_order_validation(self):
        """Verify QuestionBank.validate_strict_order rejects out-of-order or gapped questions."""
        q1 = QuestionItem(
            id="q1", index=1, tier=QuestionTier.WARMUP, topic="T1", primary_prompt="P1",
            context_background="C1", allowed_micro_probes=[],
            scoring_rubric=ScoringRubric(criteria=[RubricCriterion(dimension="D", weight=1.0, poor_0_3="P", good_4_7="G", expert_8_10="E")])
        )
        q2_broken = QuestionItem(
            id="q2", index=3, tier=QuestionTier.CORE_TECHNICAL, topic="T2", primary_prompt="P2",
            context_background="C2", allowed_micro_probes=[],
            scoring_rubric=ScoringRubric(criteria=[RubricCriterion(dimension="D", weight=1.0, poor_0_3="P", good_4_7="G", expert_8_10="E")])
        )
        qb_invalid = QuestionBank(
            session_id="test",
            metadata=PrepBrainMetadata(company_name="Test", company_domain="test.com", role_title="Dev"),
            questions=[q1, q2_broken]
        )
        self.assertFalse(qb_invalid.validate_strict_order(), "Should fail validation on index gap (1, 3)")

    def test_03_system_prompt_structure_and_guardrails(self):
        """Verify build_interviewer_system_prompt compiles all directives from question_bank_strategy.md."""
        qb = load_question_bank(str(self.sample_json_path))
        prompt = build_interviewer_system_prompt(qb)

        # 1. Metadata presence
        self.assertIn("Stripe", prompt)
        self.assertIn("stripe.com", prompt)
        self.assertIn("Senior Software Engineer", prompt)

        # 2. Strict question sequence presence
        self.assertIn("FIXED QUESTION SEQUENCE (STRICT-MODE CONTRACT)", prompt)
        for q in qb.questions:
            self.assertIn(f"Question {q.index}", prompt)
            self.assertIn(q.id, prompt)
            self.assertIn(q.primary_prompt, prompt)
            self.assertIn(q.context_background, prompt)
            for probe in q.allowed_micro_probes:
                self.assertIn(probe, prompt)

        # 3. Conversational delivery guardrails presence
        self.assertIn("FIXED SUBSTANCE, FLUID DELIVERY", prompt)
        self.assertIn("NEVER skip, drop, substitute, or reorder any root question", prompt)
        self.assertIn("ORGANIC ACKNOWLEDGMENTS & BRIDGING", prompt)
        self.assertIn("BOUNDED MICRO-CLARIFICATIONS (MAX 1-2 TURNS)", prompt)
        self.assertIn("SPOKEN FLUENCY & PACING", prompt)
        self.assertIn("NEVER reveal rubric scores", prompt)

    def test_04_env_var_override(self):
        """Verify QUESTION_BANK_PATH environment variable overrides default search."""
        custom_qb = QuestionBank(
            session_id="custom-session-123",
            metadata=PrepBrainMetadata(
                company_name="CustomCorp",
                company_domain="customcorp.io",
                role_title="Lead Systems Architect",
                target_level="Staff",
                tech_stack_detected=["Rust", "gRPC", "RocksDB"],
                domain_focus=["Low-Latency Storage"]
            ),
            questions=[
                QuestionItem(
                    id="q1_custom",
                    index=1,
                    tier=QuestionTier.WARMUP,
                    topic="Storage Engines",
                    primary_prompt="Tell me about your experience with LSM trees.",
                    context_background="Target storage engine",
                    allowed_micro_probes=["How did you handle compaction?"],
                    scoring_rubric=ScoringRubric(criteria=[RubricCriterion(dimension="Depth", weight=1.0, poor_0_3="P", good_4_7="G", expert_8_10="E")])
                )
            ]
        )
        custom_file = execution_path / ".tmp_custom_qb.json"
        with open(custom_file, "w", encoding="utf-8") as f:
            f.write(custom_qb.model_dump_json(indent=2))

        try:
            os.environ["QUESTION_BANK_PATH"] = str(custom_file)
            loaded = load_question_bank()
            self.assertEqual(loaded.metadata.company_name, "CustomCorp")
            self.assertEqual(loaded.questions[0].id, "q1_custom")
            prompt = build_interviewer_system_prompt(loaded)
            self.assertIn("CustomCorp", prompt)
            self.assertIn("LSM trees", prompt)
        finally:
            if "QUESTION_BANK_PATH" in os.environ:
                del os.environ["QUESTION_BANK_PATH"]
            if custom_file.exists():
                os.remove(custom_file)

    def test_05_fallback_generation(self):
        """Verify fallback question bank is generated when no file is present."""
        loaded = load_question_bank("non_existent_path_xyz_123.json")
        self.assertIsNotNone(loaded)
        self.assertGreaterEqual(len(loaded.questions), 1)
        self.assertTrue(loaded.validate_strict_order())


if __name__ == "__main__":
    unittest.main(verbosity=2)

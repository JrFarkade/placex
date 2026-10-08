"""
PlaceX Prep Brain — Question Generator Smoke Test (Diagnose-Only)
Runs generate_question_bank() using a hardcoded company research dictionary and pretty-prints the result.
"""

import json
import os
import sys
from pathlib import Path

# Ensure execution folder is accessible
_workspace_root = Path(__file__).resolve().parent.parent.parent
_execution_path = _workspace_root / "execution"
if str(_workspace_root) not in sys.path:
    sys.path.insert(0, str(_workspace_root))
if str(_execution_path) not in sys.path:
    sys.path.insert(0, str(_execution_path))

from execution.prep_brain.question_generator import generate_question_bank


def main():
    print("=" * 70)
    print(" PlaceX Prep Brain — Question Generator Diagnostic Smoke Test")
    print("=" * 70)

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        masked_key = gemini_key[:7] + "..." + gemini_key[-4:] if len(gemini_key) > 12 else "[SET]"
        print(f"[+] GEMINI_API_KEY detected: {masked_key}")
    else:
        print("[-] GEMINI_API_KEY: NOT SET in environment")

    sample_research = {
        "company": "Stripe",
        "summary": (
            "Stripe provides economic infrastructure for the internet. Core engineering domains include "
            "high-throughput payment APIs, idempotent transaction processing, distributed ledger consistency, "
            "Kafka event streaming pipelines, database sharding, and zero-downtime ledger migrations."
        ),
        "sources": ["https://stripe.com/blog", "https://stripe.com/docs"],
        "raw_results": [],
    }

    test_role = "Senior Backend Distributed Systems Engineer"
    test_difficulty = "L5 / Senior"
    test_domains = ["Idempotency & Concurrency", "Kafka Event Pipelines", "Database Sharding"]

    print(f"\n[Test Inputs]")
    print(f"Company:          {sample_research['company']}")
    print(f"Target Role:      {test_role}")
    print(f"Difficulty Level: {test_difficulty}")
    print(f"Domain Focus:     {', '.join(test_domains)}")
    print("\nExecuting generate_question_bank()...\n")

    try:
        qb = generate_question_bank(
            research=sample_research,
            role=test_role,
            difficulty=test_difficulty,
            domain_interests=test_domains,
        )

        questions = qb.get("questions", [])
        print(f"[+] Successfully generated Question Bank with {len(questions)} questions:\n")
        print("-" * 70)
        for i, q in enumerate(questions, start=1):
            print(f"Question #{i} | Tier: [{q.get('tier', 'N/A').upper()}] | Category: {q.get('category', 'General')}")
            print(f"Prompt: \"{q.get('question_text')}\"")
            rubric = q.get("scoring_rubric", {})
            criteria = rubric.get("criteria", [])
            print(f"Point Scale: {rubric.get('point_scale', 10)}")
            print("Rubric Criteria:")
            for c in criteria:
                print(f"  - {c}")
            print("-" * 70)

        print("\nFull Output JSON (formatted):")
        print(json.dumps(qb, indent=2))
        print("\n[+] Question generator smoke test passed successfully.")

    except Exception as e:
        print(f"\n[-] Question generator smoke test failed with exception: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

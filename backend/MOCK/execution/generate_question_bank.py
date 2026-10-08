"""
PlaceX Prep Brain — Deterministic Question Bank Generator (v1)
Generates tiered question blueprints with strict scoring rubrics conforming to:
- directives/question_bank_strategy.md
- directives/prep-scoring-brain/question_bank_generation.md
"""

import sys
import os
import json
import argparse
from typing import Dict, Any

# Add workspace execution path to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from prep_brain_schema import (
    QuestionBank,
    PrepBrainMetadata,
    QuestionItem,
    QuestionTier,
    ScoringRubric,
    RubricCriterion,
    PrepBrainJobInput,
)
from scrape_company_context import scrape_company_context, fetch_candidate_signals


def generate_mock_question_bank(job_input: PrepBrainJobInput, company_ctx: Dict[str, Any], candidate_ctx: Dict[str, Any]) -> QuestionBank:
    """Generates a calibrated 4-tier question bank in dry-run/mock mode."""
    company_name = company_ctx.get("company_name", "Acme Corp")
    domain = company_ctx.get("company_domain", "acme.com")
    tech_stack = company_ctx.get("tech_stack", ["Python", "Distributed Systems", "Kafka", "PostgreSQL"])

    questions = [
        QuestionItem(
            id="q1_warmup",
            index=1,
            tier=QuestionTier.WARMUP,
            topic="High-Level Architecture & Background",
            primary_prompt=(
                f"To start off, could you walk me through the highest-scale backend system you've built recently, "
                f"specifically highlighting where bottlenecks occurred and how you resolved them?"
            ),
            context_background=f"Calibrates candidate's comfort level and baseline seniority against {company_name}'s scale.",
            allowed_micro_probes=[
                "What was the primary bottleneck: disk I/O, database concurrency, or network latency?",
                "How did you measure and monitor that latency in production?"
            ],
            scoring_rubric=ScoringRubric(
                max_points=10,
                criteria=[
                    RubricCriterion(
                        dimension="Architectural Clarity",
                        weight=0.5,
                        poor_0_3="Vague, cannot clearly explain component boundaries or data flow.",
                        good_4_7="Coherently describes services, database interactions, and cache layer.",
                        expert_8_10="Precise breakdown with concrete throughput numbers (RPS, p99 latency) and failure modes."
                    ),
                    RubricCriterion(
                        dimension="Tradeoff Articulation",
                        weight=0.5,
                        poor_0_3="Focuses only on what went well, ignores architectural compromises.",
                        good_4_7="Acknowledges why certain technologies were chosen over alternatives.",
                        expert_8_10="Deep insight into technical debt taken on, operational burden, and future scale limits."
                    )
                ],
                key_phrases_expected=["throughput", "latency", "caching", "bottleneck", "sharding"],
                anti_patterns=["claiming the architecture had zero tradeoffs", "unable to quote rough scale numbers"]
            )
        ),
        QuestionItem(
            id="q2_core_technical",
            index=2,
            tier=QuestionTier.CORE_TECHNICAL,
            topic="Data Consistency & Idempotency",
            primary_prompt=(
                f"In high-throughput services like {company_name}'s core ingestion pipeline, we often receive duplicate event streams. "
                f"How would you design an idempotent processing pipeline using Kafka and a relational database without degrading write throughput?"
            ),
            context_background=f"Tests core distributed data consistency requirements relevant to {company_name}'s domain.",
            allowed_micro_probes=[
                "How do you handle the race condition if two identical events arrive concurrently across worker pods?",
                "What is your strategy if the cache expires before downstream acknowledgment?"
            ],
            scoring_rubric=ScoringRubric(
                max_points=10,
                criteria=[
                    RubricCriterion(
                        dimension="Correctness & Concurrency Control",
                        weight=0.6,
                        poor_0_3="Proposes naive read-then-write check without locking, vulnerable to race conditions.",
                        good_4_7="Uses unique database constraint or distributed lock (Redis/Redlock) with idempotency keys.",
                        expert_8_10="Proposes transactional outbox pattern, DB-level upsert with deterministic deduplication token, or changelog CDC."
                    ),
                    RubricCriterion(
                        dimension="Performance Optimization",
                        weight=0.4,
                        poor_0_3="Proposes global blocking lock that collapses throughput to 10 RPS.",
                        good_4_7="Partitions Kafka keys to guarantee partition-level ordering.",
                        expert_8_10="Combines partition hashing with bloom filters or sliding window Redis buffers to minimize DB roundtrips."
                    )
                ],
                key_phrases_expected=["idempotency key", "kafka partition", "transactional outbox", "unique constraint", "upsert"],
                anti_patterns=["assuming Kafka never delivers duplicates with at-least-once semantics", "in-memory only dedup across multi-pod cluster"]
            )
        ),
        QuestionItem(
            id="q3_deep_architecture",
            index=3,
            tier=QuestionTier.DEEP_ARCHITECTURE,
            topic="Fault Tolerance & Cascading Failures",
            primary_prompt=(
                f"Imagine our downstream authentication or billing dependency starts timing out under a 10x traffic spike. "
                f"Walk me through your resilience architecture: how do you prevent thread pool exhaustion and cascading failure across the entire fleet?"
            ),
            context_background="Evaluates senior-level reliability engineering, backpressure mechanisms, and graceful degradation.",
            allowed_micro_probes=[
                "What criteria do you use to configure circuit breaker trip thresholds?",
                "How do you distinguish between a transient network blip and hard downstream degradation?"
            ],
            scoring_rubric=ScoringRubric(
                max_points=10,
                criteria=[
                    RubricCriterion(
                        dimension="Resilience Patterns",
                        weight=0.5,
                        poor_0_3="Suggests infinite retries with exponential backoff on synchronous request threads.",
                        good_4_7="Implements circuit breakers, tight request timeouts, and jittered backoff.",
                        expert_8_10="Outlines adaptive concurrency limits, load shedding, bulkhead isolation, and fallback response paths."
                    ),
                    RubricCriterion(
                        dimension="Operational Telemetry",
                        weight=0.5,
                        poor_0_3="Relies on users complaining or basic error log searching.",
                        good_4_7="Instruments p95/p99 latency histograms, circuit state metrics, and alert thresholds.",
                        expert_8_10="Discusses synthetic canary probing, graceful degradation mode telemetry, and automated rollback triggers."
                    )
                ],
                key_phrases_expected=["circuit breaker", "bulkhead", "load shedding", "jitter", "backpressure", "timeout budget"],
                anti_patterns=["unbounded retries causing retry storms", "blocking main event loop during timeout"]
            )
        ),
        QuestionItem(
            id="q4_behavioral_tradeoff",
            index=4,
            tier=QuestionTier.BEHAVIORAL_TRADEOFF,
            topic="Engineering Decision Making & Conflict",
            primary_prompt=(
                f"Tell me about a time you had a strong technical disagreement with a team lead or principal architect on a system design choice. "
                f"How did you evaluate the competing proposals, and how did you resolve it?"
            ),
            context_background="Evaluates constructive technical advocacy, ego management, and pragmatic alignment.",
            allowed_micro_probes=[
                "What empirical data or proof of concept did you bring to the discussion?",
                "If the decision went against your preference, how did you handle execution?"
            ],
            scoring_rubric=ScoringRubric(
                max_points=10,
                criteria=[
                    RubricCriterion(
                        dimension="Pragmatism & Objectivity",
                        weight=0.5,
                        poor_0_3="Complains about coworkers, exhibits dogmatic tech favoritism.",
                        good_4_7="Describes using benchmarks, RFCs, and pros/cons matrices to evaluate options.",
                        expert_8_10="Shows empathy for business constraints, aligns on organizational goals, and demonstrates 'disagree and commit' maturity."
                    ),
                    RubricCriterion(
                        dimension="Ownership & Reflection",
                        weight=0.5,
                        poor_0_3="Blames leadership for any downstream failure.",
                        good_4_7="Owns their portion of the outcome and highlights lessons learned.",
                        expert_8_10="Analyzes what long-term architectural signals proved true and how they would refine the decision framework today."
                    )
                ],
                key_phrases_expected=["RFC", "benchmarking", "disagree and commit", "business priority", "proof of concept"],
                anti_patterns=["passive-aggressive compliance", "insisting on rewriting systems without justification"]
            )
        )
    ]

    metadata = PrepBrainMetadata(
        company_name=company_name,
        company_domain=domain,
        role_title=job_input.role_title,
        target_level=job_input.target_level,
        tech_stack_detected=tech_stack,
        domain_focus=company_ctx.get("domain_focus", ["Distributed Backend Engineering"])
    )

    qb = QuestionBank(
        metadata=metadata,
        questions=questions
    )
    assert qb.validate_strict_order(), "Question sequence must be strictly ordered 1..N"
    return qb


def run_job(args: argparse.Namespace) -> None:
    job_input = PrepBrainJobInput(
        company_url=args.company_url,
        candidate_github=args.candidate_github,
        candidate_linkedin_summary=args.candidate_linkedin,
        role_title=args.role,
        target_level=args.level,
        num_questions=args.num_questions
    )

    company_ctx = scrape_company_context(job_input.company_url, dry_run=args.dry_run)
    candidate_ctx = fetch_candidate_signals(job_input.candidate_github, job_input.candidate_linkedin_summary, dry_run=args.dry_run)

    question_bank = generate_mock_question_bank(job_input, company_ctx, candidate_ctx)

    output_json = question_bank.model_dump_json(indent=2)

    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"[+] Prep Brain question bank saved to: {args.output}")
    else:
        print(output_json)


def main():
    parser = argparse.ArgumentParser(description="PlaceX Prep Brain — Question Bank & Rubric Generator")
    parser.add_argument("--company-url", required=True, help="Target company website URL (e.g. https://stripe.com)")
    parser.add_argument("--candidate-github", default=None, help="Candidate GitHub profile URL or username")
    parser.add_argument("--candidate-linkedin", default=None, help="Candidate summary text or LinkedIn bio")
    parser.add_argument("--role", default="Senior Software Engineer", help="Target role title")
    parser.add_argument("--level", default="L5 / Senior", help="Target seniority level")
    parser.add_argument("--num-questions", type=int, default=4, help="Number of tiered questions (default 4)")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Run in deterministic dry-run mode without external API calls")
    parser.add_argument("--output", default=None, help="Optional filepath to save generated question bank JSON")

    args = parser.parse_args()
    run_job(args)


if __name__ == "__main__":
    main()

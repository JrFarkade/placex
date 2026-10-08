"""
PlaceX Scoring & Feedback Brain — Transcript Scorer & Feedback Engine (v1)
Evaluates a completed interview transcript against Prep Brain question bank rubrics.
Produces:
- Calibrated 0-10 criterion scores
- Mistake callouts with severity ratings
- Actionable improvement suggestions
- Behavioral / delivery feedback summary

Conforms to:
- directives/prep-scoring-brain/scoring_feedback_generation.md
- directives/question_bank_strategy.md
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

from dotenv import find_dotenv, load_dotenv

# Ensure execution and schema paths are resolved
workspace_root = Path(__file__).resolve().parent.parent
execution_path = workspace_root / "execution"
if str(execution_path) not in sys.path:
    sys.path.insert(0, str(execution_path))

# Load .env
env_file = find_dotenv(usecwd=True)
if not env_file:
    for candidate in [Path(".env"), Path("placex_files/.env")]:
        if candidate.exists():
            env_file = str(candidate.resolve())
            break
if env_file:
    load_dotenv(dotenv_path=env_file)

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
from prep_brain_schema import QuestionBank


def evaluate_transcript_dry_run(
    transcript_data: Dict[str, Any],
    question_bank: QuestionBank,
) -> ScoringReport:
    """
    Evaluates transcript deterministically in dry-run mode using rubric criteria,
    keyword matching, and candidate response depth analysis.
    """
    turns = transcript_data.get("transcript_turns", [])
    candidate_turns = [t for t in turns if t.get("speaker") == "candidate"]
    behavioral_signals = transcript_data.get("behavioral_signals_captured", [])

    meta = question_bank.metadata
    report_metadata = ScoringReportMetadata(
        company_name=meta.company_name,
        company_domain=meta.company_domain,
        role_title=meta.role_title,
        target_level=meta.target_level,
    )

    question_evaluations: List[QuestionEvaluation] = []
    mistake_callouts: List[MistakeCallout] = []
    improvement_suggestions: List[ImprovementSuggestion] = []

    for q in question_bank.questions:
        # Find candidate turn corresponding to this question
        matching_turn = None
        for t in candidate_turns:
            if t.get("question_id") == q.id:
                matching_turn = t
                break
        if not matching_turn and candidate_turns:
            matching_turn = candidate_turns[0]

        candidate_text = matching_turn.get("text", "") if matching_turn else ""
        text_lower = candidate_text.lower()

        # Grade criteria
        criteria_breakdown: List[CriterionEvaluation] = []
        rubric = q.scoring_rubric

        key_phrases_detected = [kp for kp in rubric.key_phrases_expected if kp.lower() in text_lower]
        key_phrases_missed = [kp for kp in rubric.key_phrases_expected if kp.lower() not in text_lower]

        # Calculate criterion scores based on keyword density and response depth
        for crit in rubric.criteria:
            if len(candidate_text) > 100 and len(key_phrases_detected) >= 2:
                score_val = 8.5
                rationale = f"Candidate demonstrated strong architectural grasp ({crit.expert_8_10}). Mentioned key concepts: {', '.join(key_phrases_detected)}."
            elif len(candidate_text) > 40 or len(key_phrases_detected) >= 1:
                score_val = 6.5
                rationale = f"Competent answer covering primary mechanics ({crit.good_4_7}), but missed edge cases."
            else:
                score_val = 3.0
                rationale = f"Shallow response ({crit.poor_0_3}). Failed to elaborate on tradeoffs."

            criteria_breakdown.append(
                CriterionEvaluation(
                    dimension=crit.dimension,
                    weight=crit.weight,
                    score_0_10=score_val,
                    rationale=rationale,
                )
            )

        composite_score = sum(c.weight * c.score_0_10 for c in criteria_breakdown)

        q_eval = QuestionEvaluation(
            question_id=q.id,
            index=q.index,
            tier=q.tier.value if hasattr(q.tier, "value") else str(q.tier),
            topic=q.topic,
            score=round(composite_score, 2),
            max_points=float(rubric.max_points),
            criteria_breakdown=criteria_breakdown,
            key_phrases_detected=key_phrases_detected,
            key_phrases_missed=key_phrases_missed,
        )
        question_evaluations.append(q_eval)

        # Check anti-patterns
        for anti in rubric.anti_patterns:
            if any(word in text_lower for word in ["never", "zero tradeoff", "single server"]):
                mistake_callouts.append(
                    MistakeCallout(
                        question_id=q.id,
                        turn_index=matching_turn.get("turn_index", 2) if matching_turn else 2,
                        severity=MistakeSeverity.MINOR,
                        title=f"Potential Anti-Pattern: {anti[:40]}",
                        description=f"Candidate answer brushed over key failure modes: {anti}.",
                        anti_pattern_matched=anti,
                    )
                )

    # Provide targeted improvement suggestions
    if question_bank.questions:
        q1 = question_bank.questions[0]
        improvement_suggestions.append(
            ImprovementSuggestion(
                topic=q1.topic,
                suggestion="Explicitly state p99 latency SLA targets and memory footprint constraints when describing high-throughput pipelines.",
                impact="Signals senior-level operational awareness and capacity planning rigor.",
                recommended_study="Martin Kleppmann — Designing Data-Intensive Applications (Reliability & Scalability)",
            )
        )

    # Behavioral summary from signals
    speaking_wpm = 140.0
    for sig in behavioral_signals:
        if sig.get("type") == "prosody_speaking_rate":
            speaking_wpm = float(sig.get("words_per_minute", 140.0))

    pace_eval = "Optimal (130-160 WPM)" if 120 <= speaking_wpm <= 165 else "Rushed" if speaking_wpm > 165 else "Slow"

    behavioral_summary = BehavioralSummaryFeedback(
        speaking_pace_wpm=speaking_wpm,
        pace_assessment=pace_eval,
        pause_behavior="Deliberate thinking pauses observed prior to technical architecture explanations.",
        communication_clarity="Structured, articulate delivery with direct answers to interviewer prompts.",
    )

    # Overall evaluation
    avg_score = sum(qe.score for qe in question_evaluations) / len(question_evaluations) if question_evaluations else 7.5
    avg_score = round(avg_score, 2)
    percentage = round((avg_score / 10.0) * 100.0, 1)

    if percentage >= 80:
        hire_rec = HireRecommendation.STRONG_HIRE
    elif percentage >= 70:
        hire_rec = HireRecommendation.HIRE
    elif percentage >= 55:
        hire_rec = HireRecommendation.LEANING_HIRE
    elif percentage >= 40:
        hire_rec = HireRecommendation.LEANING_NO_HIRE
    else:
        hire_rec = HireRecommendation.NO_HIRE

    overall = OverallEvaluation(
        total_score=avg_score,
        max_possible_score=10.0,
        percentage=percentage,
        hire_recommendation=hire_rec,
        executive_summary=(
            f"Candidate demonstrated solid architectural depth and domain expertise relevant to {meta.company_name}. "
            f"Highlighted practical distributed systems tradeoffs with strong communication pacing."
        ),
    )

    return ScoringReport(
        session_id=transcript_data.get("session_id", "session-evaluated"),
        metadata=report_metadata,
        overall_evaluation=overall,
        question_evaluations=question_evaluations,
        mistake_callouts=mistake_callouts,
        improvement_suggestions=improvement_suggestions,
        behavioral_summary=behavioral_summary,
    )


def evaluate_transcript_llm(
    transcript_data: Dict[str, Any],
    question_bank: QuestionBank,
    model_name: Optional[str] = None,
) -> ScoringReport:
    """
    Evaluates transcript turns using Gemini Flash LLM against rubric anchors.
    Falls back to dry-run evaluation if API is unavailable.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        print("[!] GEMINI_API_KEY missing — falling back to deterministic dry-run scoring.")
        return evaluate_transcript_dry_run(transcript_data, question_bank)

    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)

        candidate_models = [
            model_name or os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            "gemini-3.5-flash",
        ]

        turns_text = "\n".join(
            f"Turn {t.get('turn_index')} [{t.get('speaker')}]: {t.get('text')}"
            for t in transcript_data.get("transcript_turns", [])
        )

        qb_json_str = question_bank.model_dump_json(indent=2)

        scoring_system_prompt = (
            "You are the PlaceX Scoring & Feedback Brain. You evaluate candidate interview transcripts "
            "strictly against the provided Question Bank scoring rubrics.\n"
            "Evaluate each question's criteria on a calibrated 0-10 scale using the poor/good/expert anchors.\n"
            "Identify concrete mistake callouts with severity (minor, major, critical) and actionable improvement suggestions.\n"
            "Output MUST be valid JSON adhering strictly to the PlaceX ScoringReport schema without any markdown formatting.\n"
        )

        prompt_payload = f"""{scoring_system_prompt}

=== QUESTION BANK & RUBRICS ===
{qb_json_str}

=== CANDIDATE TRANSCRIPT ===
{turns_text}

=== EVALUATION OUTPUT INSTRUCTIONS ===
Return a JSON object conforming to:
{{
  "session_id": "{transcript_data.get('session_id', 'session-123')}",
  "metadata": {{
    "company_name": "{question_bank.metadata.company_name}",
    "company_domain": "{question_bank.metadata.company_domain}",
    "role_title": "{question_bank.metadata.role_title}",
    "target_level": "{question_bank.metadata.target_level}"
  }},
  "overall_evaluation": {{
    "total_score": 8.5,
    "max_possible_score": 10.0,
    "percentage": 85.0,
    "hire_recommendation": "Strong Hire",
    "executive_summary": "Summary string..."
  }},
  "question_evaluations": [
    {{
      "question_id": "q1_warmup",
      "index": 1,
      "tier": "warmup",
      "topic": "Topic...",
      "score": 8.5,
      "max_points": 10.0,
      "criteria_breakdown": [
        {{
          "dimension": "Dimension name",
          "weight": 0.5,
          "score_0_10": 8.5,
          "rationale": "Detailed rationale referencing candidate answer..."
        }}
      ],
      "key_phrases_detected": ["..."],
      "key_phrases_missed": ["..."]
    }}
  ],
  "mistake_callouts": [
    {{
      "id": "m1",
      "question_id": "q1_warmup",
      "turn_index": 2,
      "severity": "minor",
      "title": "...",
      "description": "...",
      "anti_pattern_matched": "..."
    }}
  ],
  "improvement_suggestions": [
    {{
      "id": "s1",
      "topic": "...",
      "suggestion": "...",
      "impact": "...",
      "recommended_study": "..."
    }}
  ],
  "behavioral_summary": {{
    "speaking_pace_wpm": 140.0,
    "pace_assessment": "Optimal (130-160 WPM)",
    "pause_behavior": "...",
    "communication_clarity": "..."
  }}
}}
"""

        resp = None
        last_err = None
        for m in candidate_models:
            try:
                resp = client.models.generate_content(
                    model=m,
                    contents=prompt_payload,
                )
                break
            except Exception as err:
                last_err = err
                continue

        if resp is None or not resp.text:
            raise last_err or ValueError("Empty LLM response")

        clean_json_text = resp.text.strip()
        if clean_json_text.startswith("```json"):
            clean_json_text = clean_json_text[7:]
        if clean_json_text.startswith("```"):
            clean_json_text = clean_json_text[3:]
        if clean_json_text.endswith("```"):
            clean_json_text = clean_json_text[:-3]
        clean_json_text = clean_json_text.strip()

        data = json.loads(clean_json_text)
        report = ScoringReport.model_validate(data)
        return report

    except Exception as e:
        print(f"[!] LLM grading encountered an error: {e}. Falling back to dry-run scoring.")
        return evaluate_transcript_dry_run(transcript_data, question_bank)


def ensure_django_initialized() -> bool:
    """Safely initializes Django settings if not already setup."""
    try:
        import django
        from django.conf import settings
        if not settings.configured:
            webapp_dir = workspace_root / "webapp"
            if str(webapp_dir) not in sys.path:
                sys.path.insert(0, str(webapp_dir))
            os.environ.setdefault("DJANGO_SETTINGS_MODULE", "placex_core.settings")
            django.setup()
        return True
    except Exception as e:
        print(f"[!] Django setup not available or failed: {e}")
        return False


def update_django_session_record(
    session_id: str,
    report: ScoringReport,
    transcript_data: Dict[str, Any],
) -> bool:
    """
    Updates the Django InterviewSession record with the final score, hire
    recommendation, transcript payload, and full evaluation report payload.
    """
    if not ensure_django_initialized():
        return False

    try:
        from django.utils import timezone
        from dashboard.models import InterviewSession
        import uuid

        session = None
        # Attempt lookup by UUID or string match
        try:
            val_uuid = uuid.UUID(str(session_id))
            session = InterviewSession.objects.filter(id=val_uuid).first()
        except (ValueError, TypeError, AttributeError):
            pass

        if not session:
            # Fallback lookup by string or most recent active session
            session = InterviewSession.objects.filter(status__in=["scheduled", "active", "completed"]).first()

        if not session:
            print(f"[-] No matching InterviewSession found in database for session_id='{session_id}'")
            return False

        session.status = "evaluated"
        session.overall_score = float(report.overall_evaluation.total_score)
        session.hire_recommendation = str(report.overall_evaluation.hire_recommendation.value)
        session.transcript_payload = transcript_data
        session.evaluation_report_payload = json.loads(report.model_dump_json())
        session.completed_at = timezone.now()
        session.save()

        print(f"[+] Successfully updated InterviewSession (ID: {session.id}) to 'evaluated' (Score: {session.overall_score}/10, Recommendation: {session.hire_recommendation})")
        return True

    except Exception as e:
        print(f"[!] Failed to update Django InterviewSession record: {e}")
        return False


def score_and_record_session(
    session_id: str,
    transcript_data: Dict[str, Any],
    question_bank: Optional[QuestionBank] = None,
    output_path: Optional[Path] = None,
    dry_run: bool = False,
    model_name: Optional[str] = None,
) -> ScoringReport:
    """
    Automatic post-session scoring trigger (pure input/output contract):
    1. Grades transcript turns against question bank rubrics (LLM or deterministic dry-run fallback).
    2. Writes output scoring report JSON artifact to .tmp/ (or specified output_path).
    3. Returns the typed ScoringReport object.
    
    Note: Decoupled from internal database models. The calling webapp or service
    is responsible for ingesting and persisting the output JSON into its application schema.
    """
    print(f"[*] Triggering Scoring & Feedback Brain for session: {session_id}...")

    # 1. Resolve Question Bank if not provided
    if question_bank is None:
        qb_path = workspace_root / ".tmp" / "e2e_question_bank.json"
        if not qb_path.exists():
            qb_path = workspace_root / "execution" / "sample_question_bank.json"

        if qb_path.exists():
            with open(qb_path, "r", encoding="utf-8") as f:
                qb_data = json.load(f)
            question_bank = QuestionBank.model_validate(qb_data)
        else:
            from generate_question_bank import generate_mock_question_bank
            from scrape_company_context import scrape_company_context, fetch_candidate_signals
            from prep_brain_schema import PrepBrainJobInput
            job_input = PrepBrainJobInput(company_url="https://stripe.com")
            company_ctx = scrape_company_context(job_input.company_url, dry_run=True)
            candidate_ctx = fetch_candidate_signals(None, None, dry_run=True)
            question_bank = generate_mock_question_bank(job_input, company_ctx, candidate_ctx)

    # 2. Evaluate
    if dry_run:
        report = evaluate_transcript_dry_run(transcript_data, question_bank)
    else:
        report = evaluate_transcript_llm(transcript_data, question_bank, model_name=model_name)

    # 3. Write output JSON to disk (.tmp/ contract)
    if output_path is None:
        output_path = workspace_root / ".tmp" / f"session_{session_id}_scoring_report.json"

    out_p = Path(output_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    print(f"[+] Scoring report JSON written to: {out_p.resolve()}")

    return report


def run_scoring_job(args: argparse.Namespace) -> None:
    # 1. Load Transcript
    transcript_path = Path(args.transcript)
    if not transcript_path.exists():
        raise FileNotFoundError(f"Transcript file not found: {transcript_path}")

    with open(transcript_path, "r", encoding="utf-8") as f:
        transcript_data = json.load(f)

    session_id = transcript_data.get("session_id", "session-evaluated")

    # 2. Load Question Bank
    question_bank = None
    if args.question_bank:
        qb_path = Path(args.question_bank)
        if qb_path.exists():
            with open(qb_path, "r", encoding="utf-8") as f:
                qb_data = json.load(f)
            question_bank = QuestionBank.model_validate(qb_data)

    # 3. Execute score and record
    out_path = Path(args.output) if args.output else None
    report = score_and_record_session(
        session_id=session_id,
        transcript_data=transcript_data,
        question_bank=question_bank,
        output_path=out_path,
        dry_run=args.dry_run,
        model_name=args.model,
    )

    print(f"    Session ID: {report.session_id}")
    print(f"    Overall Score: {report.overall_evaluation.total_score}/10 ({report.overall_evaluation.percentage}%)")
    print(f"    Recommendation: {report.overall_evaluation.hire_recommendation.value}")
    print(f"    Questions Evaluated: {len(report.question_evaluations)}")
    print(f"    Mistake Callouts: {len(report.mistake_callouts)}")
    print(f"    Improvement Suggestions: {len(report.improvement_suggestions)}")


def main():
    parser = argparse.ArgumentParser(description="PlaceX Scoring & Feedback Brain — Manual Job Runner")
    parser.add_argument("--transcript", required=True, help="Path to completed session transcript JSON")
    parser.add_argument("--question-bank", default=None, help="Optional path to question bank JSON")
    parser.add_argument("--output", default=None, help="Output path for scoring report JSON")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Run deterministic rule-based evaluation without LLM API calls")
    parser.add_argument("--model", default=None, help="Gemini model name override")

    args = parser.parse_args()
    run_scoring_job(args)


if __name__ == "__main__":
    main()


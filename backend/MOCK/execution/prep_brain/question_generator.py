"""
PlaceX Prep Brain — Question Generator
Generates customized interview question banks with rubrics based on company research, role, difficulty, and domain interests.
Uses Gemini 3.5 Flash Lite for batch generation to maximize free-tier quota efficiency.
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import find_dotenv, load_dotenv

# Ensure environment variables are loaded if .env exists
_env_path = find_dotenv(usecwd=True)
if not _env_path:
    for candidate in [
        Path(".env"),
        Path("placex_files/.env"),
        Path(__file__).resolve().parent.parent.parent / "placex_files" / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]:
        if candidate.exists():
            _env_path = str(candidate.resolve())
            break
if _env_path:
    load_dotenv(dotenv_path=_env_path)


def _strip_markdown_fences(text: str) -> str:
    """Strips markdown code fences and extracts the outermost JSON object string."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Extract JSON between outermost curly braces if extra commentary exists
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return cleaned[first_brace : last_brace + 1]
    return cleaned


def _validate_and_normalize_question_bank(data: Any) -> Dict[str, Any]:
    """Validates and normalizes the structure of the returned question bank."""
    if not isinstance(data, dict) or "questions" not in data or not isinstance(data["questions"], list):
        raise ValueError("Root payload must contain a 'questions' list.")

    valid_tiers = {"warm-up", "core", "stretch"}
    for q in data["questions"]:
        if not isinstance(q, dict):
            raise ValueError("Each item in 'questions' must be a dictionary.")
        if "question_text" not in q or not q["question_text"]:
            raise ValueError("Question item is missing 'question_text'.")

        tier = str(q.get("tier", "")).lower().strip()
        if tier not in valid_tiers:
            if "warm" in tier:
                q["tier"] = "warm-up"
            elif "stretch" in tier:
                q["tier"] = "stretch"
            else:
                q["tier"] = "core"

        q.setdefault("category", "Technical Architecture")

        rubric = q.get("scoring_rubric")
        if not isinstance(rubric, dict):
            q["scoring_rubric"] = {
                "criteria": ["Demonstrates technical accuracy and clear tradeoff rationale."],
                "point_scale": 10,
            }
        else:
            if "criteria" not in rubric or not isinstance(rubric["criteria"], list) or not rubric["criteria"]:
                rubric["criteria"] = ["Demonstrates technical accuracy, structure, and depth."]
            rubric.setdefault("point_scale", 10)

    return data


def generate_question_bank(
    research: Dict[str, Any],
    role: str,
    difficulty: str,
    domain_interests: Optional[List[str]] = None,
    model_name: str = "gemini-3.5-flash-lite",
) -> Dict[str, Any]:
    """
    Generates a structured, tiered question bank with scoring rubrics tailored
    to company research, candidate target role, difficulty, and domain interests.

    Uses Gemini 3.5 Flash Lite by default for generous async batch generation quotas.

    Args:
        research: Dict containing company research (must include 'summary' and optionally 'company')
        role: Target role title (e.g., 'Senior Distributed Systems Engineer')
        difficulty: Target difficulty level (e.g., 'Senior', 'Staff', 'Mid-Level')
        domain_interests: Optional list of technical focus areas (e.g., ['Kafka', 'Distributed Transactions'])
        model_name: Model override (defaults to 'gemini-3.5-flash-lite')

    Returns:
        Dict adhering to:
        {
            "questions": [
                {
                    "question_text": str,
                    "tier": "warm-up" | "core" | "stretch",
                    "category": str,
                    "scoring_rubric": {
                        "criteria": [str],
                        "point_scale": int
                    }
                }
            ]
        }
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Please ensure GEMINI_API_KEY is available in your environment."
        )

    company_name = research.get("company", "Target Company")
    company_summary = research.get("summary", "No company summary provided.")
    domains_str = ", ".join(domain_interests) if domain_interests else "General Engineering & Architecture"

    system_instructions = (
        "You are an expert technical hiring bar-raiser creating calibrated interview questions "
        "for PlaceX technical candidate evaluations.\n"
        "Generate a structured interview question bank containing questions across three tiers: "
        "'warm-up' (1 question), 'core' (2-3 questions), and 'stretch' (1-2 questions).\n"
        "Each question must have a precise spoken interview prompt, topic category, and an objective "
        "scoring rubric with evaluation criteria and a point scale of 10.\n"
        "Output MUST be ONLY strict, valid JSON without any markdown formatting, conversational filler, or code fences."
    )

    prompt = f"""{system_instructions}

=== TARGET COMPANY CONTEXT ===
Company: {company_name}
Summary / Tech Stack / Eng Culture:
{company_summary}

=== CANDIDATE EVALUATION PROFILE ===
Target Role: {role}
Target Seniority / Difficulty: {difficulty}
Technical Domain Interests: {domains_str}

=== REQUIRED JSON OUTPUT SCHEMA ===
Return a single JSON object matching this exact schema:
{{
  "questions": [
    {{
      "question_text": "Spoken substantive technical interview question...",
      "tier": "warm-up",
      "category": "Topic Category",
      "scoring_rubric": {{
        "criteria": [
          "Evaluation criterion 1...",
          "Evaluation criterion 2..."
        ],
        "point_scale": 10
      }}
    }},
    {{
      "question_text": "Core technical question...",
      "tier": "core",
      "category": "Topic Category",
      "scoring_rubric": {{
        "criteria": [
          "Evaluation criterion 1...",
          "Evaluation criterion 2..."
        ],
        "point_scale": 10
      }}
    }},
    {{
      "question_text": "Stretch technical or architectural challenge question...",
      "tier": "stretch",
      "category": "Topic Category",
      "scoring_rubric": {{
        "criteria": [
          "Evaluation criterion 1...",
          "Evaluation criterion 2..."
        ],
        "point_scale": 10
      }}
    }}
  ]
}}

Remember: Output ONLY valid JSON starting with {{ and ending with }}. No markdown backticks."""

    from google import genai

    client = genai.Client(api_key=api_key)

    candidate_models = [
        model_name,
        "gemini-3.5-flash",
    ]

    last_error: Optional[Exception] = None
    response_text = ""
    active_model = model_name

    # Attempt initial generation with model cascade fallback if needed
    for model in candidate_models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
            if response and response.text:
                response_text = response.text
                active_model = model
                break
        except Exception as e:
            last_error = e
            continue

    if not response_text:
        raise RuntimeError(f"Failed to generate question bank from Gemini: {last_error}")

    # Attempt to parse JSON response
    try:
        clean_text = _strip_markdown_fences(response_text)
        data = json.loads(clean_text)
        return _validate_and_normalize_question_bank(data)
    except (json.JSONDecodeError, ValueError) as parse_err:
        # Retry once with strict correction prompt
        retry_prompt = (
            f"The previous response could not be parsed as valid JSON. Parse error: {parse_err}\n\n"
            f"Previous output was:\n{response_text}\n\n"
            "Please fix all syntax issues and return ONLY valid JSON matching:\n"
            "{\"questions\": [{\"question_text\": str, \"tier\": \"warm-up\"|\"core\"|\"stretch\", \"category\": str, \"scoring_rubric\": {\"criteria\": [str], \"point_scale\": 10}}]}"
        )
        try:
            retry_response = client.models.generate_content(
                model=active_model,
                contents=retry_prompt,
            )
            if retry_response and retry_response.text:
                retry_clean = _strip_markdown_fences(retry_response.text)
                retry_data = json.loads(retry_clean)
                return _validate_and_normalize_question_bank(retry_data)
        except Exception as retry_err:
            raise RuntimeError(
                f"Failed to parse question bank JSON after retry. Error: {retry_err}\nRaw output: {response_text}"
            ) from retry_err

    raise RuntimeError(f"Unexpected termination during question bank parsing. Error: {last_error}")

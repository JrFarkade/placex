"""
app/core/gemini.py
~~~~~~~~~~~~~~~~~~
Async wrapper around the Google Gemini API.
Generates structured MCQ objects validated by Pydantic.
"""

import json
import logging
from typing import Any, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Pydantic schema for a single generated question ───────────────────────────
class _GeneratedQuestion(BaseModel):
    question_text: str = Field(..., description="The MCQ question text. Use Markdown code blocks for code snippets.")
    options: list[str] = Field(..., min_length=4, max_length=4, description="Exactly 4 answer options")
    correct_option_index: int = Field(..., ge=0, le=3, description="0-based index of the correct option")
    explanation: str = Field(..., description="Detailed explanation of the correct answer")
    sub_topic: str = Field(..., description="Specific sub-topic within the domain")
    question_type: str = Field(default="theory", description="Question format: 'theory', 'code', or 'scenario'")
    difficulty: str = Field(..., description="easy | medium | hard")


class _GeneratedQuestionList(BaseModel):
    questions: list[_GeneratedQuestion]


# ── System prompt template ─────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are an expert question-bank author specialising in technical and aptitude assessments.
Generate high-quality, unambiguous multiple-choice questions (MCQs).

Rules:
- Each question must have EXACTLY 4 options labelled as plain strings (not A/B/C/D prefixed).
- The correct_option_index is 0-based (0, 1, 2, or 3).
- Avoid trivial or trick questions; prefer conceptual depth.
- If question_type is 'code', include realistic, syntactically correct code snippets enclosed in markdown fenced code blocks (```python, ```sql, etc.).
- The explanation must be clear, concise, and educational (2-4 sentences).
- Vary difficulty across easy / medium / hard as requested.
- Do NOT repeat questions that are common knowledge; prefer nuanced scenarios.
"""


def _build_prompt(domain: str, sub_topic: str, question_type: str, difficulty: str, count: int) -> str:
    type_instruction = ""
    if question_type == "code":
        type_instruction = "All questions MUST include Markdown-formatted code snippets (e.g. in Python, SQL, Bash) with question_type set to 'code'."
    elif question_type == "scenario":
        type_instruction = "All questions MUST be real-world scenario/case-based problems with question_type set to 'scenario'."
    else:
        type_instruction = "Questions should focus on conceptual and theoretical knowledge with question_type set to 'theory'."

    return (
        f"Generate exactly {count} MCQ question(s) for the domain '{domain}', "
        f"sub-topic '{sub_topic}', difficulty level '{difficulty}', question_type '{question_type}'.\n\n"
        f"{type_instruction}\n\n"
        "Return a JSON object matching this schema:\n"
        "{ \"questions\": [ { \"question_text\": str, \"options\": [str,str,str,str], "
        "\"correct_option_index\": int, \"explanation\": str, "
        "\"sub_topic\": str, \"question_type\": str, \"difficulty\": str } ] }"
    )


async def generate_questions(
    domain: str,
    sub_topic: str,
    question_type: str = "theory",
    difficulty: str = "medium",
    count: int = 10,
) -> list[dict[str, Any]]:
    """
    Call Gemini to generate `count` MCQs for the given domain / sub_topic / question_type.
    Returns a list of dicts ready for bulk-inserting into the Question table.
    Raises RuntimeError if the API key is missing or generation fails.
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your .env file to enable "
            "AI question generation."
        )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = _build_prompt(domain, sub_topic, question_type, difficulty, count)

    logger.info(
        "Calling Gemini (%s) to generate %d questions — domain=%s sub_topic=%s type=%s",
        settings.GEMINI_MODEL, count, domain, sub_topic, question_type,
    )

    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.7,
                max_output_tokens=8192,
            ),
        )
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    raw_text = response.text
    logger.debug("Gemini raw response: %s", raw_text[:500])

    # ── Parse & validate ───────────────────────────────────────────────────────
    try:
        raw_data = json.loads(raw_text)
        validated = _GeneratedQuestionList.model_validate(raw_data)
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.error("Failed to parse Gemini response: %s\nRaw: %s", exc, raw_text)
        raise RuntimeError(f"Gemini response parsing failed: {exc}") from exc

    results: list[dict[str, Any]] = []
    for q in validated.questions:
        results.append({
            "domain": domain,
            "question_type": q.question_type or question_type,
            "sub_topic": q.sub_topic,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "options": q.options,
            "correct_option_index": q.correct_option_index,
            "explanation": q.explanation,
            "source": "AI_Generated",
        })

    logger.info("Gemini generated %d valid questions.", len(results))
    return results

"""
app/schemas/quiz.py
~~~~~~~~~~~~~~~~~~~
Pydantic v2 schemas for quiz start, submission, and response payloads.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.question import DomainEnum, QuestionTypeEnum


# ── Quiz Start ─────────────────────────────────────────────────────────────────

class QuizStartRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=64, examples=["user_001"])
    domains: list[DomainEnum] = Field(
        ...,
        min_length=1,
        description="One or more domains. Pass multiple for a mixed quiz.",
        examples=[["Aptitude", "AIML"]],
    )
    question_type: Optional[str] = Field(
        default=None,
        description="Filter questions by type: 'theory', 'code', 'scenario', or 'all'/'mixed' (default)",
        examples=["code"],
    )
    num_questions: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Total number of questions requested (1–50)",
    )

    @field_validator("domains")
    @classmethod
    def deduplicate_domains(cls, v: list[DomainEnum]) -> list[DomainEnum]:
        seen: set = set()
        return [x for x in v if not (x in seen or seen.add(x))]  # type: ignore[func-returns-value]


class QuizStartResponse(BaseModel):
    quiz_id: str = Field(..., description="Ephemeral session ID to include in submit payload")
    user_id: str
    domains: list[str]
    question_type: Optional[str] = None
    total_questions: int
    questions: list[dict]  # QuestionOut dicts — answer hidden


# ── Quiz Submission ────────────────────────────────────────────────────────────

class SubmitAnswer(BaseModel):
    question_id: int = Field(..., ge=1)
    selected_option_index: int = Field(..., ge=0, le=3)


class QuizSubmitRequest(BaseModel):
    quiz_id: str = Field(..., description="quiz_id returned from /start")
    user_id: str = Field(..., min_length=1, max_length=64)
    domains: list[DomainEnum] = Field(
        ..., min_length=1, description="Same domains passed to /start"
    )
    answers: list[SubmitAnswer] = Field(..., min_length=1)


# ── Answer Key ────────────────────────────────────────────────────────────────

class AnswerKeyItem(BaseModel):
    question_id: int
    question_text: str
    options: list[str]
    correct_option_index: int
    selected_option_index: int
    is_correct: bool
    explanation: str
    domain: str
    question_type: str = "theory"
    sub_topic: str
    difficulty: str
    points_earned: int = Field(description="1 if correct, 0 if incorrect")


class QuizSubmitResponse(BaseModel):
    attempt_id: str
    user_id: str
    quiz_id: str
    domains: list[str]
    total_questions: int
    score: int
    percentage: float
    points_earned: int
    submitted_at: datetime
    answer_key: list[AnswerKeyItem]


# ── Domain List ───────────────────────────────────────────────────────────────

class DomainListResponse(BaseModel):
    domains: list[str]
    question_types: list[str] = ["theory", "code", "scenario", "all"]
    description: str = "Supported domains and question types for quiz generation"

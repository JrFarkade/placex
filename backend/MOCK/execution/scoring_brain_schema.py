"""
PlaceX Scoring & Feedback Brain — Data Models & Schema Contract
Defines Pydantic models for rubric criteria grading, mistake callouts,
improvement suggestions, and the overall post-session scoring report.
Conforms to:
- directives/prep-scoring-brain/scoring_feedback_generation.md
- directives/question_bank_strategy.md
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid


class HireRecommendation(str, Enum):
    STRONG_HIRE = "Strong Hire"
    HIRE = "Hire"
    LEANING_HIRE = "Leaning Hire"
    LEANING_NO_HIRE = "Leaning No Hire"
    NO_HIRE = "No Hire"
    INCONCLUSIVE = "Inconclusive / Incomplete Session"


class MistakeSeverity(str, Enum):
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


class CriterionEvaluation(BaseModel):
    dimension: str = Field(..., description="Rubric evaluation dimension")
    weight: float = Field(..., ge=0.0, le=1.0, description="Relative weight summing to 1.0 across criteria")
    score_0_10: float = Field(..., ge=0.0, le=10.0, description="Calibrated score on a 0-10 anchor scale")
    rationale: str = Field(..., description="Justification referencing candidate specific answers and anchor descriptions")


class QuestionEvaluation(BaseModel):
    question_id: str = Field(..., description="Unique question ID matching the Prep Brain question bank")
    index: int = Field(..., ge=1, description="Question 1-indexed execution position")
    tier: str = Field(..., description="Tier identifier (e.g. warmup, core_technical, deep_architecture, behavioral_tradeoff)")
    topic: str = Field(..., description="Subject or problem domain")
    score: float = Field(..., ge=0.0, description="Weighted composite score for this question")
    max_points: float = Field(default=10.0, description="Max points possible for this question")
    criteria_breakdown: List[CriterionEvaluation] = Field(..., min_length=1)
    key_phrases_detected: List[str] = Field(default_factory=list, description="Expected technical concepts mentioned by candidate")
    key_phrases_missed: List[str] = Field(default_factory=list, description="Expected technical concepts not mentioned")

    def calculate_weighted_score(self) -> float:
        """Calculates and verifies the weighted composite score from criteria."""
        return sum(c.weight * c.score_0_10 for c in self.criteria_breakdown)


class MistakeCallout(BaseModel):
    id: str = Field(default_factory=lambda: f"m_{uuid.uuid4().hex[:6]}")
    question_id: str = Field(..., description="Question ID where mistake occurred")
    turn_index: Optional[int] = Field(default=None, description="Transcript turn index reference")
    severity: MistakeSeverity = Field(..., description="Mistake impact classification (minor, major, critical)")
    title: str = Field(..., description="Concise mistake headline")
    description: str = Field(..., description="Detailed explanation of the flaw, missing tradeoff, or anti-pattern")
    anti_pattern_matched: Optional[str] = Field(default=None, description="Anti-pattern from rubric if matched")


class ImprovementSuggestion(BaseModel):
    id: str = Field(default_factory=lambda: f"s_{uuid.uuid4().hex[:6]}")
    topic: str = Field(..., description="Subject area (e.g. Concurrency, Distributed Consistency, Rate Limiting)")
    suggestion: str = Field(..., description="Actionable technical coaching recommendation")
    impact: str = Field(..., description="Why this improvement matters in production or high-scale systems")
    recommended_study: str = Field(..., description="Recommended reading, RFC, or architectural pattern to review")


class BehavioralSummaryFeedback(BaseModel):
    speaking_pace_wpm: float = Field(..., description="Words per minute speaking cadence")
    pace_assessment: str = Field(..., description="Descriptive evaluation of speaking cadence (e.g. Optimal, Rushed, Slow)")
    pause_behavior: str = Field(..., description="Evaluation of pause duration and thinking intervals")
    communication_clarity: str = Field(..., description="Overall communication structure and MECE conciseness")


class OverallEvaluation(BaseModel):
    total_score: float = Field(..., ge=0.0, le=10.0, description="Overall weighted average score across questions")
    max_possible_score: float = Field(default=10.0)
    percentage: float = Field(..., ge=0.0, le=100.0, description="Overall score percentage")
    hire_recommendation: HireRecommendation = Field(..., description="Calibrated hiring signal recommendation")
    executive_summary: str = Field(..., description="Holistic evaluation summary for interview panel and candidate")


class ScoringReportMetadata(BaseModel):
    company_name: str
    company_domain: str
    role_title: str
    target_level: str = "L5 / Senior"


class ScoringReport(BaseModel):
    session_id: str = Field(..., description="Unique session UUID matching transcript and question bank")
    evaluated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: ScoringReportMetadata
    overall_evaluation: OverallEvaluation
    question_evaluations: List[QuestionEvaluation] = Field(..., min_length=1)
    mistake_callouts: List[MistakeCallout] = Field(default_factory=list)
    improvement_suggestions: List[ImprovementSuggestion] = Field(default_factory=list)
    behavioral_summary: Optional[BehavioralSummaryFeedback] = None

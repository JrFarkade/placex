"""
app/schemas/dashboard.py
~~~~~~~~~~~~~~~~~~~~~~~~
Pydantic v2 schemas for the dashboard stats endpoint.
"""

from pydantic import BaseModel, Field


class DomainStat(BaseModel):
    domain: str
    total_attempted: int = Field(description="Total quiz questions attempted in this domain")
    correct: int
    incorrect: int
    accuracy_pct: float = Field(description="Accuracy percentage (0–100)")
    mastered_count: int = Field(description="Questions marked as 'mastered'")
    learning_count: int = Field(description="Questions currently in the 'learning' review queue")
    quiz_sessions: int = Field(description="Number of quiz sessions in this domain")


class DashboardResponse(BaseModel):
    user_id: str
    total_quizzes: int
    total_questions_attempted: int
    overall_accuracy_pct: float
    total_mastered: int
    total_learning: int
    primary_domain: str = Field(description="Domain with the most quiz activity")
    domain_stats: list[DomainStat]

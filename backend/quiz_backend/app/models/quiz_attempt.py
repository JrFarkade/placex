"""
app/models/quiz_attempt.py
~~~~~~~~~~~~~~~~~~~~~~~~~~
QuizAttempt (session-level summary) and QuizAttemptDetail (per-question).
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    attempt_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(64), nullable=False)  # comma-joined if mixed
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    details: Mapped[list["QuizAttemptDetail"]] = relationship(
        "QuizAttemptDetail", back_populates="attempt", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<QuizAttempt id={self.attempt_id} user={self.user_id} score={self.score}/{self.total_questions}>"


class QuizAttemptDetail(Base):
    __tablename__ = "quiz_attempt_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quiz_attempts.attempt_id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    selected_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    attempt: Mapped["QuizAttempt"] = relationship("QuizAttempt", back_populates="details")
    question = relationship("Question", lazy="select")

    def __repr__(self) -> str:
        return (
            f"<QuizAttemptDetail attempt={self.attempt_id} q={self.question_id} "
            f"correct={self.is_correct}>"
        )

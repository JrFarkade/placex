"""
app/models/user_progress.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tracks per-user, per-question spaced-repetition state.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProgressStatusEnum(str, enum.Enum):
    learning = "learning"
    mastered = "mastered"


class UserProgress(Base):
    __tablename__ = "user_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        Enum(ProgressStatusEnum, name="progress_status_enum"),
        nullable=False,
        default="learning",
    )
    incorrect_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    consecutive_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # Relationships
    question = relationship("Question", lazy="select")

    def __repr__(self) -> str:
        return (
            f"<UserProgress user={self.user_id} q={self.question_id} "
            f"status={self.status} cc={self.consecutive_correct}>"
        )

"""
app/models/__init__.py
~~~~~~~~~~~~~~~~~~~~~~
Re-export all ORM models so that SQLAlchemy's metadata is fully
populated whenever this package is imported (e.g. from database.py
during table creation or from Alembic autogenerate).
"""

from app.models.question import (  # noqa: F401
    DifficultyEnum,
    DomainEnum,
    Question,
    QuestionTypeEnum,
    SourceEnum,
)
from app.models.quiz_attempt import QuizAttempt, QuizAttemptDetail  # noqa: F401
from app.models.user_progress import ProgressStatusEnum, UserProgress  # noqa: F401

__all__ = [
    "Question",
    "DomainEnum",
    "DifficultyEnum",
    "QuestionTypeEnum",
    "SourceEnum",
    "UserProgress",
    "ProgressStatusEnum",
    "QuizAttempt",
    "QuizAttemptDetail",
]

"""
app/models/question.py
~~~~~~~~~~~~~~~~~~~~~~
ORM model for the Question entity.
"""

import enum

from sqlalchemy import JSON, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DomainEnum(str, enum.Enum):
    Aptitude = "Aptitude"
    SoftwareEngineering = "SoftwareEngineering"
    AIML = "AIML"
    DataScience = "DataScience"
    CyberSecurity = "CyberSecurity"


class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionTypeEnum(str, enum.Enum):
    theory = "theory"
    code = "code"
    scenario = "scenario"


class SourceEnum(str, enum.Enum):
    Curated = "Curated"
    AI_Generated = "AI_Generated"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    domain: Mapped[str] = mapped_column(
        Enum(DomainEnum, name="domain_enum"), nullable=False, index=True
    )
    question_type: Mapped[str] = mapped_column(
        Enum(QuestionTypeEnum, name="question_type_enum"),
        nullable=False,
        default=QuestionTypeEnum.theory,
        index=True,
    )
    sub_topic: Mapped[str] = mapped_column(String(120), nullable=False)
    difficulty: Mapped[str] = mapped_column(
        Enum(DifficultyEnum, name="difficulty_enum"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Stored as a JSON array of 4 strings
    options: Mapped[list] = mapped_column(JSON, nullable=False)
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(
        Enum(SourceEnum, name="source_enum"),
        nullable=False,
        default="Curated",
    )

    def __repr__(self) -> str:
        return f"<Question id={self.id} domain={self.domain} type={self.question_type} difficulty={self.difficulty}>"

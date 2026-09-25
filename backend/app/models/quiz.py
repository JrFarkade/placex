import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, Enum, Boolean, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.session import Base

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

class ProgressStatusEnum(str, enum.Enum):
    learning = "learning"
    mastered = "mastered"

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    domain = Column(String(64), nullable=False, index=True)
    question_type = Column(String(32), nullable=False, default="theory", index=True)
    sub_topic = Column(String(120), nullable=False)
    difficulty = Column(String(32), nullable=False, default="medium")
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False) # Array of 4 string options
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    source = Column(String(32), nullable=False, default="Curated")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    attempt_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), nullable=False, index=True)
    domain = Column(String(64), nullable=False)
    total_questions = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False, default=0)
    percentage = Column(Float, nullable=False, default=0.0)
    submitted_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    details = relationship("QuizAttemptDetail", back_populates="attempt", cascade="all, delete-orphan")

class QuizAttemptDetail(Base):
    __tablename__ = "quiz_attempt_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(String(36), ForeignKey("quiz_attempts.attempt_id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_option_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)

    attempt = relationship("QuizAttempt", back_populates="details")
    question = relationship("Question", lazy="joined")

class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="learning")
    incorrect_count = Column(Integer, nullable=False, default=0)
    consecutive_correct = Column(Integer, nullable=False, default=0)
    last_reviewed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    question = relationship("Question", lazy="joined")

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON, UniqueConstraint
from app.database.session import Base

class CodingQuestion(Base):
    __tablename__ = "coding_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    difficulty = Column(String(50), default="Medium", nullable=False) # Easy, Medium, Hard
    category = Column(String(100), default="Arrays", nullable=False) # SQL, Python, Arrays, Data Analysis, DSA, Strings, Hash Maps, Trees, etc.
    role_tags = Column(JSON, default=list, nullable=True) # ["Data Analyst", "Software Engineer"]
    company_tags = Column(JSON, default=list, nullable=True)
    estimated_time = Column(String(50), default="15 mins", nullable=True)
    problem_statement = Column(Text, nullable=False)
    input_format = Column(Text, nullable=True)
    output_format = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    starter_code = Column(JSON, default=dict, nullable=False) # {"python": "...", "javascript": "...", "cpp": "..."}
    visible_testcases = Column(JSON, default=list, nullable=False)
    hidden_testcases = Column(JSON, default=list, nullable=False)
    hints = Column(JSON, default=list, nullable=True)
    editorial = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("coding_questions.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(50), nullable=False) # python, javascript, cpp
    source_code = Column(Text, nullable=False)
    status = Column(String(50), nullable=False) # Accepted, Wrong Answer, Runtime Error, Compilation Error
    runtime_ms = Column(Float, default=0.0, nullable=True)
    memory_kb = Column(Float, default=0.0, nullable=True)
    passed_testcases = Column(Integer, default=0, nullable=False)
    total_testcases = Column(Integer, default=0, nullable=False)
    code_quality_score = Column(Float, default=0.0, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class CodingDraft(Base):
    __tablename__ = "coding_drafts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("coding_questions.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(50), nullable=False)
    source_code = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', 'language', name='uix_user_question_lang'),
    )

class CodingBookmark(Base):
    __tablename__ = "coding_bookmarks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("coding_questions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'question_id', name='uix_user_question_bookmark'),
    )

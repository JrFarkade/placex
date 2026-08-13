from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON, Boolean
from app.database.session import Base

class CodingQuestion(Base):
    __tablename__ = "coding_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    difficulty = Column(String(50), default="Medium", nullable=False) # Easy, Medium, Hard
    category = Column(String(100), default="Arrays", nullable=False)
    company_tags = Column(JSON, default=list, nullable=True)
    problem_statement = Column(Text, nullable=False)
    input_format = Column(Text, nullable=True)
    output_format = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    visible_testcases = Column(JSON, default=list, nullable=False)
    hidden_testcases = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("coding_questions.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(50), nullable=False) # python, java, cpp, javascript
    source_code = Column(Text, nullable=False)
    status = Column(String(50), nullable=False) # Accepted, Wrong Answer, Time Limit Exceeded, Error
    runtime_ms = Column(Float, default=0.0, nullable=True)
    memory_kb = Column(Float, default=0.0, nullable=True)
    passed_testcases = Column(Integer, default=0, nullable=False)
    total_testcases = Column(Integer, default=0, nullable=False)
    code_quality_score = Column(Float, default=0.0, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
from app.database.session import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    interview_type = Column(String(50), default="Technical", nullable=False) # HR, Technical, Viva, Resume
    target_company = Column(String(255), nullable=True)
    duration_minutes = Column(Integer, default=30, nullable=False)
    status = Column(String(50), default="In Progress", nullable=False) # Completed, Abandoned, In Progress
    overall_score = Column(Float, default=0.0, nullable=True)
    score_breakdown = Column(JSON, default=dict, nullable=True)
    ai_feedback_report = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

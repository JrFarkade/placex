from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
from app.database.session import Base

class PlacementReadiness(Base):
    __tablename__ = "placement_readiness"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    readiness_score = Column(Float, default=0.0, nullable=False) # 0-100
    readiness_level = Column(String(50), default="Beginner", nullable=False) # Beginner, Foundation, Intermediate, Placement Ready, Interview Ready
    score_breakdown = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_role = Column(String(255), nullable=False)
    target_company = Column(String(255), nullable=True)
    phases = Column(JSON, default=list, nullable=False)
    daily_tasks = Column(JSON, default=list, nullable=False)
    weekly_tasks = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

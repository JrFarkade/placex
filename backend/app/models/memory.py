from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
from app.database.session import Base

class StudentMemory(Base):
    __tablename__ = "student_memory"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Dual Memory Model
    short_term_context = Column(JSON, default=dict, nullable=False)
    long_term_memory = Column(JSON, default=dict, nullable=False)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class HostLog(Base):
    __tablename__ = "host_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    intent = Column(String(100), nullable=False)
    services_executed = Column(JSON, default=list, nullable=False)
    processing_time = Column(Float, nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

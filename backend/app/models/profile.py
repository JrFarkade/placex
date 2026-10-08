from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON, UniqueConstraint
from app.database.session import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    university = Column(String(255), nullable=True)
    degree = Column(String(255), nullable=True)
    branch = Column(String(255), nullable=True)
    cgpa = Column(Float, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    
    target_company = Column(String(255), default=None, nullable=True)
    target_role = Column(String(255), default=None, nullable=True)
    
    bio = Column(Text, nullable=True)
    skills = Column(JSON, default=list, nullable=True)
    programming_languages = Column(JSON, default=list, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class ConnectedProfile(Base):
    __tablename__ = "connected_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # "github", "linkedin", "leetcode"
    username = Column(String(255), nullable=True)
    profile_url = Column(String(512), nullable=False)
    connection_type = Column(String(50), nullable=False)  # "oauth" or "profile_url"
    profile_data = Column(JSON, default=dict, nullable=True)  # Public fetched profile metadata (never sensitive tokens)
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'platform', name='uix_user_platform'),
    )

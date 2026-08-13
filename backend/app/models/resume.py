from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
from app.database.session import Base

class ResumeUpload(Base):
    __tablename__ = "resume_uploads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50), nullable=False) # pdf / docx
    version = Column(Integer, default=1, nullable=False)
    parsed_data = Column(JSON, default=dict, nullable=True)
    ats_score = Column(Float, default=0.0, nullable=True)
    ats_breakdown = Column(JSON, default=dict, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

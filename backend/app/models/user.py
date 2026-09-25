from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
import enum
from app.database.session import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMINISTRATOR = "administrator"
    RECRUITER = "recruiter"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False, default="oauth_google_no_password")
    role = Column(String(50), default=UserRole.STUDENT.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Google OAuth fields
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    auth_provider = Column(String(50), default="email", nullable=False)  # "email" or "google"
    profile_image = Column(String(512), nullable=True)
    last_login = Column(DateTime, default=datetime.utcnow, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

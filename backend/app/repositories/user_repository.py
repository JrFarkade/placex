from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.profile import StudentProfile
from app.models.memory import StudentMemory
from app.schemas.user import UserCreate, ProfileCreate
from app.core.security import get_password_hash

class UserRepository:

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_google_id(db: Session, google_id: str) -> Optional[User]:
        return db.query(User).filter(User.google_id == google_id).first()

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email,
            full_name=user_in.full_name,
            hashed_password=hashed_password,
            role=user_in.role or "student",
            auth_provider="email",
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Initialize clean empty student profile & memory (no fake hardcoded stats)
        if db_user.role == "student":
            profile = StudentProfile(
                user_id=db_user.id,
                target_company=None,
                target_role=None,
                university=None,
                degree=None,
                branch=None,
                cgpa=None,
                graduation_year=None,
                bio=None,
                skills=[],
                programming_languages=[]
            )
            memory = StudentMemory(
                user_id=db_user.id,
                short_term_context={"current_feature": "dashboard"},
                long_term_memory={
                    "user_id": db_user.id,
                    "name": db_user.full_name,
                    "target_company": None,
                    "target_role": None,
                    "skills": [],
                    "readiness_score": None,
                    "readiness_level": "Not Calculated",
                    "resume_score": None,
                    "coding_solved": 0,
                    "completed_interviews": 0
                }
            )
            db.add(profile)
            db.add(memory)
            db.commit()

        return db_user

    @staticmethod
    def get_or_create_google_user(db: Session, google_info: Dict[str, Any]) -> User:
        google_id = google_info.get("sub") or google_info.get("id")
        email = google_info.get("email")
        full_name = google_info.get("name") or google_info.get("given_name") or "Google Student"
        picture = google_info.get("picture")

        if not email or not google_id:
            raise ValueError("Google user info missing required email or subject ID.")

        # 1. Search by google_id
        user = UserRepository.get_by_google_id(db, google_id)
        if user:
            user.last_login = datetime.utcnow()
            if picture:
                user.profile_image = picture
            db.commit()
            db.refresh(user)
            return user

        # 2. Search by email (Account Linking)
        user = UserRepository.get_by_email(db, email)
        if user:
            user.google_id = google_id
            user.last_login = datetime.utcnow()
            if picture and not user.profile_image:
                user.profile_image = picture
            db.commit()
            db.refresh(user)
            return user

        # 3. Create new Google User
        db_user = User(
            email=email,
            full_name=full_name,
            google_id=google_id,
            hashed_password="oauth_google_no_password",
            role="student",
            auth_provider="google",
            profile_image=picture,
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Initialize clean empty student profile & memory (no fake hardcoded stats)
        profile = StudentProfile(
            user_id=db_user.id,
            target_company=None,
            target_role=None,
            university=None,
            degree=None,
            branch=None,
            cgpa=None,
            graduation_year=None,
            bio=None,
            skills=[],
            programming_languages=[]
        )
        memory = StudentMemory(
            user_id=db_user.id,
            short_term_context={"current_feature": "dashboard"},
            long_term_memory={
                "user_id": db_user.id,
                "name": db_user.full_name,
                "target_company": None,
                "target_role": None,
                "skills": [],
                "readiness_score": None,
                "readiness_level": "Not Calculated",
                "resume_score": None,
                "coding_solved": 0,
                "completed_interviews": 0
            }
        )
        db.add(profile)
        db.add(memory)
        db.commit()

        return db_user

    @staticmethod
    def get_profile(db: Session, user_id: int) -> Optional[StudentProfile]:
        return db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()

    @staticmethod
    def update_profile(db: Session, user_id: int, profile_in: ProfileCreate) -> StudentProfile:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        if not profile:
            profile = StudentProfile(user_id=user_id)
            db.add(profile)
        
        for field, value in profile_in.dict(exclude_unset=True).items():
            setattr(profile, field, value)
        
        db.commit()
        db.refresh(profile)
        return profile

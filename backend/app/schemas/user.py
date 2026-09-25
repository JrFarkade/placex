from typing import Optional, List
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "student"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class ProfileBase(BaseModel):
    university: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = None
    graduation_year: Optional[int] = None
    target_company: Optional[str] = None
    target_role: Optional[str] = None
    readiness_score: Optional[float] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = []
    programming_languages: Optional[List[str]] = []

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

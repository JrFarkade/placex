from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.learning_engine.services.learning_service import LearningService
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/roadmap", tags=["Learning Intelligence Engine"])

class GoalUpdateRequest(BaseModel):
    target_role: str
    target_company: Optional[str] = None

class TopicToggleRequest(BaseModel):
    topic_name: str
    completed: bool

@router.get("/")
def get_roadmap(
    target_role: Optional[str] = None,
    target_company: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return LearningService.get_roadmap_and_plan(
        db=db,
        user_id=current_user.id,
        target_role=target_role,
        target_company=target_company
    )

@router.post("/goal")
def update_roadmap_goal(
    goal_in: GoalUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    profile = UserRepository.get_profile(db, current_user.id)
    if profile:
        profile.target_role = goal_in.target_role
        profile.target_company = goal_in.target_company
        db.commit()
    return LearningService.get_roadmap_and_plan(
        db=db,
        user_id=current_user.id,
        target_role=goal_in.target_role,
        target_company=goal_in.target_company
    )

@router.post("/topic/toggle")
def toggle_topic_status(
    toggle_in: TopicToggleRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    profile = UserRepository.get_profile(db, current_user.id)
    if profile:
        current_skills = list(profile.skills or [])
        if toggle_in.completed:
            if toggle_in.topic_name not in current_skills:
                current_skills.append(toggle_in.topic_name)
        else:
            current_skills = [s for s in current_skills if s != toggle_in.topic_name]
        profile.skills = current_skills
        db.commit()
    return LearningService.get_roadmap_and_plan(db=db, user_id=current_user.id)

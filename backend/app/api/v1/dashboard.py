"""
PlaceX Dashboard API Router.
Endpoints for student daily streak, GitHub-style activity calendar,
weekly goals CRUD with real event tracking, and recent activity history.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["PlaceX Career Command Center Dashboard"])


class GoalCreateRequest(BaseModel):
    goal_type: str = Field(..., description="coding | quiz | interview | roadmap | custom")
    title: str = Field(..., min_length=2, max_length=255)
    target_count: int = Field(default=1, ge=1, le=50)


class DailyActivityPingRequest(BaseModel):
    is_login: bool = False


@router.get("/activity")
def get_streak_and_activity_calendar(
    days: int = 60,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns student streak stats and GitHub-style activity calendar.
    """
    return DashboardService.get_streak_and_calendar(db, current_user.id, days_count=days)


@router.post("/activity/ping")
def ping_activity(
    req: DailyActivityPingRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Records a student login or dashboard interaction for today's streak tracking.
    """
    record = DashboardService.record_activity(db, current_user.id, is_login=req.is_login)
    return {
        "status": "success",
        "activity_date": record.activity_date.isoformat(),
        "login_count": record.login_count,
        "actions_count": record.actions_count
    }


@router.get("/goals")
def get_weekly_goals(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves this week's goals with automatically synchronized progress.
    """
    goals = DashboardService.get_or_create_weekly_goals(db, current_user.id)
    return {"goals": goals}


@router.post("/goals")
def create_weekly_goal(
    req: GoalCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Adds a custom or preset weekly goal for the student.
    """
    goal = DashboardService.create_goal(
        db,
        user_id=current_user.id,
        goal_type=req.goal_type,
        title=req.title,
        target_count=req.target_count
    )
    return goal


@router.delete("/goals/{goal_id}")
def delete_weekly_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Deletes a weekly goal.
    """
    success = DashboardService.delete_goal(db, current_user.id, goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return {"status": "deleted", "id": goal_id}


@router.get("/recent-activity")
def get_recent_activities(
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves chronological recent activity across all PlaceX modules.
    """
    activities = DashboardService.get_recent_activities(db, current_user.id, limit=limit)
    return {"activities": activities}


@router.get("/todays-focus")
def get_todays_focus(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns single prioritized today's focus action derived from real student data.
    """
    focus = DashboardService.get_todays_focus(db, current_user.id)
    return {"focus": focus}


@router.get("/skills")
def get_skills_in_progress(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns skills associated with the target role and assessed activity.
    """
    skills = DashboardService.get_skills_in_progress(db, current_user.id)
    return {"skills": skills}

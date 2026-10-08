"""
PlaceX Analytics API Router.
Provides structured endpoints for Overview, Learning, Skills, and Placement analytics tabs.
All queries are strictly scoped to the authenticated student.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.services.analytics_service import AnalyticsService
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/analytics", tags=["PlaceX Student Growth & Learning Analytics"])


class GoalCreateRequest(BaseModel):
    goal_type: str = Field(..., description="coding | quiz | interview | roadmap | resume | custom")
    title: str = Field(..., min_length=2, max_length=255)
    target_count: int = Field(default=1, ge=1, le=50)


@router.get("/overview")
def get_overview_analytics(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns Overview tab metrics: summary cards, daily activity chart, weekly goals, recent activity, and today's focus.
    """
    return AnalyticsService.get_overview_analytics(db, current_user.id, days_count=days)


@router.get("/learning")
def get_learning_analytics(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns Learning tab metrics: 7-day animated tracker, activity heatmap, learning trends, and milestones.
    """
    return AnalyticsService.get_learning_analytics(db, current_user.id, days_count=days)


@router.get("/skills")
def get_skills_analytics(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns Skills tab metrics: domain quiz performance, radar chart dimensions, coding metrics, and strengths/weaknesses.
    """
    return AnalyticsService.get_skills_analytics(db, current_user.id, days_count=days)


@router.get("/placement")
def get_placement_analytics(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns Placement tab metrics: ATS resume score history, mock interview progress & competencies, and 5-tier placement readiness.
    """
    return AnalyticsService.get_placement_analytics(db, current_user.id)


@router.post("/goals")
def create_weekly_goal(
    req: GoalCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Creates a new weekly goal for the student.
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

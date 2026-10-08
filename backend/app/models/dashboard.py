from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, DateTime, UniqueConstraint
from app.database.session import Base

class StudentDailyActivity(Base):
    """
    Daily login & action activity log for GitHub-style streak calendar.
    Guaranteed unique per (user_id, activity_date) so multiple logins per calendar day
    will never artificially inflate the daily streak count.
    """
    __tablename__ = "student_daily_activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_date = Column(Date, nullable=False, index=True)
    login_count = Column(Integer, default=1, nullable=False)
    actions_count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'activity_date', name='uix_user_activity_date'),
    )


class WeeklyGoal(Base):
    """
    Persistent weekly goals for students (e.g., solve 3 coding problems, complete 2 quizzes, 1 mock interview).
    Progress auto-updates from real student events and submissions.
    """
    __tablename__ = "weekly_goals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start_date = Column(Date, nullable=False, index=True) # Monday date of the active week
    goal_type = Column(String(50), nullable=False) # "coding", "quiz", "interview", "roadmap", "custom"
    title = Column(String(255), nullable=False)
    target_count = Column(Integer, default=1, nullable=False)
    current_count = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

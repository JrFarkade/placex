"""
PlaceX Notification Service.
Generates and manages authentic, time-grounded notifications from real student data,
roadmaps, assessments, and coding milestones.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.memory import Notification
from app.models.learning import StudentRoadmapProgress
from app.models.quiz import QuizAttempt
from app.models.coding import CodingSubmission
from app.models.resume import ResumeUpload
from app.models.profile import StudentProfile
from app.host_agent.context.context_engine import get_official_roadmap_data


class NotificationService:

    @classmethod
    def get_notifications(cls, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Retrieves existing notifications or generates relevant, authentic notifications
        grounded in the student's actual PlaceX state.
        """
        # 1. Fetch existing unread and recent notifications
        existing = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at))
            .limit(15)
            .all()
        )

        # 2. If user has no notifications yet, generate initial contextual notifications
        if not existing:
            cls._generate_contextual_notifications(db, user_id)
            existing = (
                db.query(Notification)
                .filter(Notification.user_id == user_id)
                .order_by(desc(Notification.created_at))
                .limit(15)
                .all()
            )

        unread_count = sum(1 for n in existing if not n.read)

        notifications_data = [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "priority": n.priority,
                "read": n.read,
                "action_url": n.action_url,
                "created_at": n.created_at.isoformat()
            }
            for n in existing
        ]

        return {
            "unread_count": unread_count,
            "total_count": len(existing),
            "notifications": notifications_data
        }

    @classmethod
    def mark_read(cls, db: Session, user_id: int, notification_id: int) -> bool:
        """
        Marks a single notification as read with user isolation.
        """
        notif = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if notif:
            notif.read = True
            db.commit()
            return True
        return False

    @classmethod
    def mark_all_read(cls, db: Session, user_id: int) -> int:
        """
        Marks all notifications for a student as read.
        """
        unread = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.read == False)
            .all()
        )
        count = len(unread)
        for n in unread:
            n.read = True
        db.commit()
        return count

    @classmethod
    def add_notification(
        cls,
        db: Session,
        user_id: int,
        notif_type: str,
        title: str,
        message: str,
        priority: str = "normal",
        action_url: Optional[str] = None
    ) -> Notification:
        """
        Creates a new notification record.
        """
        notif = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            priority=priority,
            read=False,
            action_url=action_url,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    @classmethod
    def _generate_contextual_notifications(cls, db: Session, user_id: int):
        """
        Synthesizes real notifications based on student profile, roadmap, and activity.
        Never introduces fake dates or fabricated metrics.
        """
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        target_role = profile.target_role if profile and profile.target_role else "Software Developer"

        # 1. Career Roadmap Notification
        prog = db.query(StudentRoadmapProgress).filter(StudentRoadmapProgress.user_id == user_id).first()
        branch = prog.branch if prog else "Software Development"
        curr_week = max(prog.in_progress_weeks) if prog and prog.in_progress_weeks else 1
        roadmap_data = get_official_roadmap_data().get(branch, {}).get("Beginner", [])
        week_data = next((w for w in roadmap_data if w.get("week") == curr_week), None)
        topic = week_data.get("topic") if week_data else "Core Foundations"

        cls.add_notification(
            db, user_id,
            notif_type="roadmap",
            title="📚 Active Roadmap Milestone",
            message=f"Week {curr_week} focus: '{topic}'. Review concepts and complete milestone exercises.",
            priority="high",
            action_url="roadmap"
        )

        # 2. Quiz Assessment Notification
        cls.add_notification(
            db, user_id,
            notif_type="quiz",
            title="🧠 Technical Knowledge Assessment",
            message=f"Placement readiness quiz available for {target_role}. Test your understanding today.",
            priority="normal",
            action_url="knowledge"
        )

        # 3. Coding Challenge Notification
        cls.add_notification(
            db, user_id,
            notif_type="coding",
            title="💻 Daily Coding Challenge",
            message="Solve algorithmic exercises in the Coding Sandbox to sharpen problem-solving speed.",
            priority="normal",
            action_url="coding"
        )

        # 4. ATS Resume Check
        resume = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).first()
        if not resume:
            cls.add_notification(
                db, user_id,
                notif_type="resume",
                title="📄 Establish ATS Baseline Score",
                message="Upload your resume in the ATS Checker to identify keyword match gaps for recruiters.",
                priority="normal",
                action_url="resume"
            )

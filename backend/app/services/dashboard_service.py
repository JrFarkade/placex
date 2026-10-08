"""
PlaceX Dashboard Service.
Handles daily streak calculations, 7-Day animated tracker generation,
historical activity heatmap, weekly goals synchronization from real database events,
Today's Focus recommendation, and Skills in Progress synthesis.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from app.models.dashboard import StudentDailyActivity, WeeklyGoal
from app.models.memory import HostAgentEvent, HostAgentTask
from app.models.coding import CodingSubmission
from app.models.quiz import QuizAttempt, QuizAttemptDetail, Question, UserProgress
from app.models.interview import InterviewSession
from app.models.resume import ResumeUpload
from app.models.learning import StudentRoadmapProgress
from app.models.profile import StudentProfile
from app.host_agent.reasoning.next_action_engine import NextActionEngine


class DashboardService:
    @staticmethod
    def get_start_of_week(ref_date: Optional[date] = None) -> date:
        """Returns Monday of the week containing ref_date (defaults to today)."""
        d = ref_date or date.today()
        return d - timedelta(days=d.weekday())

    @classmethod
    def record_activity(cls, db: Session, user_id: int, is_login: bool = True, is_learning: bool = False) -> StudentDailyActivity:
        """
        Records student daily activity for today's calendar date.
        Idempotent: updates existing record for today without inflating day streak.
        Differentiates login vs qualifying learning actions.
        """
        today = date.today()
        record = db.query(StudentDailyActivity).filter(
            StudentDailyActivity.user_id == user_id,
            StudentDailyActivity.activity_date == today
        ).first()

        if record:
            if is_login:
                record.login_count += 1
            record.actions_count += 1
            record.updated_at = datetime.utcnow()
        else:
            record = StudentDailyActivity(
                user_id=user_id,
                activity_date=today,
                login_count=1 if is_login else 0,
                actions_count=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(record)

        db.commit()
        db.refresh(record)
        return record

    @classmethod
    def get_streak_and_calendar(cls, db: Session, user_id: int, days_count: int = 60) -> Dict[str, Any]:
        """
        Calculates:
        - current_streak (consecutive active calendar days ending today or yesterday)
        - longest_streak (maximum consecutive calendar days recorded)
        - active_days_this_week (number of active days in current Mon-Sun week)
        - seven_day_tracker (array of 7 days: Monday through Sunday of current week with status: completed, today, upcoming, missed)
        - motivational_message (context-grounded encouragement based on actual performance)
        - calendar (list of day cells with date, count, intensity level 0-4 for compact historical view)
        """
        today = date.today()
        
        # Ensure today is recorded if user is fetching dashboard
        cls.record_activity(db, user_id, is_login=False)

        # Query all activity dates for the student sorted ascending
        all_activities = (
            db.query(StudentDailyActivity)
            .filter(StudentDailyActivity.user_id == user_id)
            .order_by(StudentDailyActivity.activity_date.asc())
            .all()
        )

        active_dates_set = {a.activity_date for a in all_activities if a.actions_count > 0 or a.login_count > 0}
        learning_dates_set = {a.activity_date for a in all_activities if a.actions_count > 0}
        activity_by_date = {a.activity_date: (a.actions_count, a.login_count) for a in all_activities}

        # 1. Calculate current streak
        current_streak = 0
        check_date = today
        if check_date not in active_dates_set:
            # Check if student was active yesterday
            check_date = today - timedelta(days=1)

        while check_date in active_dates_set:
            current_streak += 1
            check_date -= timedelta(days=1)

        # 2. Calculate longest streak
        longest_streak = 0
        if active_dates_set:
            sorted_dates = sorted(list(active_dates_set))
            running_streak = 0
            prev_date = None
            for d in sorted_dates:
                if prev_date is None or d == prev_date + timedelta(days=1):
                    running_streak += 1
                elif d > prev_date + timedelta(days=1):
                    running_streak = 1
                if running_streak > longest_streak:
                    longest_streak = running_streak
                prev_date = d

        # 3. Seven-day Tracker for CURRENT week (Monday through Sunday)
        monday = cls.get_start_of_week(today)
        days_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        full_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        seven_days = []
        days_active_this_week = 0

        for i in range(7):
            d = monday + timedelta(days=i)
            is_active = d in active_dates_set
            has_learning = d in learning_dates_set
            is_today = d == today
            is_upcoming = d > today
            is_missed = (d < today) and not is_active

            if is_active:
                days_active_this_week += 1

            status = "completed" if is_active else ("upcoming" if is_upcoming else "missed")
            if is_today:
                status = "today" if not is_active else "completed"

            counts = activity_by_date.get(d, (0, 0))
            seven_days.append({
                "day_abbr": days_names[i],
                "day_full": full_names[i],
                "date": d.isoformat(),
                "day_number": d.day,
                "is_active": is_active,
                "has_learning": has_learning,
                "is_today": is_today,
                "is_upcoming": is_upcoming,
                "is_missed": is_missed,
                "status": status, # "completed", "today", "upcoming", "missed"
                "actions_count": counts[0],
                "login_count": counts[1]
            })

        # 4. Context-grounded motivational message
        if days_active_this_week == 7:
            motivational_message = "Incredible dedication! You have achieved a perfect 7-day streak this week."
        elif today in active_dates_set and current_streak >= 5:
            motivational_message = f"You are on fire! {current_streak} consecutive active days. Keep building momentum!"
        elif today in active_dates_set:
            motivational_message = "Great work! You have maintained your streak for today. Try a coding challenge to advance further."
        else:
            motivational_message = "Keep your streak alive! Complete a coding problem or take a quiz to log today's activity."

        # 5. Compact historical calendar (30 or 60 days)
        start_date = today - timedelta(days=days_count - 1)
        start_monday = cls.get_start_of_week(start_date)
        end_sunday = cls.get_start_of_week(today) + timedelta(days=6)

        calendar_days: List[Dict[str, Any]] = []
        curr = start_monday
        while curr <= end_sunday:
            counts = activity_by_date.get(curr, (0, 0))
            cnt = counts[0] + counts[1]
            if cnt == 0:
                level = 0
            elif cnt == 1:
                level = 1
            elif cnt <= 3:
                level = 2
            elif cnt <= 6:
                level = 3
            else:
                level = 4

            calendar_days.append({
                "date": curr.isoformat(),
                "count": cnt,
                "level": level,
                "is_today": curr == today,
                "is_future": curr > today
            })
            curr += timedelta(days=1)

        return {
            "current_streak": current_streak,
            "longest_streak": max(longest_streak, current_streak),
            "active_days_this_week": days_active_this_week,
            "total_active_days": len(active_dates_set),
            "seven_day_tracker": seven_days,
            "motivational_message": motivational_message,
            "calendar": calendar_days
        }

    @classmethod
    def get_or_create_weekly_goals(cls, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """
        Retrieves the student's weekly goals for current week.
        Synchronizes progress automatically with real submissions.
        """
        today = date.today()
        week_start = cls.get_start_of_week(today)

        goals = db.query(WeeklyGoal).filter(
            WeeklyGoal.user_id == user_id,
            WeeklyGoal.week_start_date == week_start
        ).all()

        if not goals:
            default_goals = [
                WeeklyGoal(
                    user_id=user_id,
                    week_start_date=week_start,
                    goal_type="coding",
                    title="Solve 3 Technical Coding Problems",
                    target_count=3,
                    current_count=0,
                    is_completed=False
                ),
                WeeklyGoal(
                    user_id=user_id,
                    week_start_date=week_start,
                    goal_type="quiz",
                    title="Complete 2 Knowledge Quizzes",
                    target_count=2,
                    current_count=0,
                    is_completed=False
                ),
                WeeklyGoal(
                    user_id=user_id,
                    week_start_date=week_start,
                    goal_type="interview",
                    title="Attempt 1 AI Mock Interview",
                    target_count=1,
                    current_count=0,
                    is_completed=False
                )
            ]
            db.add_all(default_goals)
            db.commit()
            goals = default_goals

        cls._sync_goal_progress(db, user_id, goals, week_start)

        res = []
        for g in goals:
            status_text = "Completed" if g.is_completed else ("In Progress" if g.current_count > 0 else "Not Started")
            res.append({
                "id": g.id,
                "goal_type": g.goal_type,
                "title": g.title,
                "target_count": g.target_count,
                "current_count": g.current_count,
                "is_completed": g.is_completed,
                "status_text": status_text,
                "week_start_date": g.week_start_date.isoformat()
            })
        return res

    @classmethod
    def _sync_goal_progress(cls, db: Session, user_id: int, goals: List[WeeklyGoal], week_start: date):
        week_start_dt = datetime.combine(week_start, datetime.min.time())
        week_end_dt = datetime.combine(week_start + timedelta(days=7), datetime.min.time())

        # Coding
        coding_count = (
            db.query(func.count(CodingSubmission.id))
            .filter(
                CodingSubmission.user_id == user_id,
                CodingSubmission.status == "Accepted",
                CodingSubmission.submitted_at >= week_start_dt,
                CodingSubmission.submitted_at < week_end_dt
            )
            .scalar() or 0
        )

        # Quizzes
        quiz_count = (
            db.query(func.count(QuizAttempt.attempt_id))
            .filter(
                QuizAttempt.user_id == str(user_id),
                QuizAttempt.submitted_at >= week_start_dt,
                QuizAttempt.submitted_at < week_end_dt
            )
            .scalar() or 0
        )

        # Interview
        interview_count = (
            db.query(func.count(InterviewSession.id))
            .filter(
                InterviewSession.user_id == user_id,
                InterviewSession.status == "Completed",
                InterviewSession.created_at >= week_start_dt,
                InterviewSession.created_at < week_end_dt
            )
            .scalar() or 0
        )

        # Roadmap
        roadmap_records = (
            db.query(StudentRoadmapProgress)
            .filter(
                StudentRoadmapProgress.user_id == user_id,
                StudentRoadmapProgress.updated_at >= week_start_dt,
                StudentRoadmapProgress.updated_at < week_end_dt
            )
            .all()
        )
        roadmap_count = sum(len(r.completed_weeks or []) for r in roadmap_records)

        # Resume upload this week
        resume_count = (
            db.query(func.count(ResumeUpload.id))
            .filter(
                ResumeUpload.user_id == user_id,
                ResumeUpload.uploaded_at >= week_start_dt,
                ResumeUpload.uploaded_at < week_end_dt
            )
            .scalar() or 0
        )

        updated_any = False
        for g in goals:
            real_val = g.current_count
            if g.goal_type == "coding":
                real_val = coding_count
            elif g.goal_type == "quiz":
                real_val = quiz_count
            elif g.goal_type == "interview":
                real_val = interview_count
            elif g.goal_type == "roadmap":
                real_val = roadmap_count
            elif g.goal_type == "resume":
                real_val = resume_count

            if g.current_count != real_val or g.is_completed != (real_val >= g.target_count):
                g.current_count = real_val
                g.is_completed = (real_val >= g.target_count)
                g.updated_at = datetime.utcnow()
                updated_any = True

        if updated_any:
            db.commit()

    @classmethod
    def create_goal(cls, db: Session, user_id: int, goal_type: str, title: str, target_count: int) -> Dict[str, Any]:
        today = date.today()
        week_start = cls.get_start_of_week(today)

        goal = WeeklyGoal(
            user_id=user_id,
            week_start_date=week_start,
            goal_type=goal_type,
            title=title,
            target_count=max(1, target_count),
            current_count=0,
            is_completed=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)

        cls._sync_goal_progress(db, user_id, [goal], week_start)

        status_text = "Completed" if goal.is_completed else ("In Progress" if goal.current_count > 0 else "Not Started")
        return {
            "id": goal.id,
            "goal_type": goal.goal_type,
            "title": goal.title,
            "target_count": goal.target_count,
            "current_count": goal.current_count,
            "is_completed": goal.is_completed,
            "status_text": status_text,
            "week_start_date": goal.week_start_date.isoformat()
        }

    @classmethod
    def delete_goal(cls, db: Session, user_id: int, goal_id: int) -> bool:
        goal = db.query(WeeklyGoal).filter(
            WeeklyGoal.id == goal_id,
            WeeklyGoal.user_id == user_id
        ).first()
        if not goal:
            return False
        db.delete(goal)
        db.commit()
        return True

    @classmethod
    def get_todays_focus(cls, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Derives an explainable, actionable 'Today's Focus' based on real database state:
        - Incomplete weekly goals
        - Recent weak quiz topics / failed coding tasks
        - Missing resume baseline
        - Active roadmap progression
        """
        # 1. Check for Next Best Action output
        try:
            nba = NextActionEngine.evaluate_next_action(db, user_id)
        except Exception:
            nba = None

        # 2. Check pending weekly goals
        today = date.today()
        week_start = cls.get_start_of_week(today)
        pending_goals = (
            db.query(WeeklyGoal)
            .filter(
                WeeklyGoal.user_id == user_id,
                WeeklyGoal.week_start_date == week_start,
                WeeklyGoal.is_completed == False
            )
            .order_by(WeeklyGoal.current_count.desc())
            .all()
        )

        if pending_goals:
            top_goal = pending_goals[0]
            remaining = top_goal.target_count - top_goal.current_count
            est_minutes = "20-30 mins" if top_goal.goal_type in ["coding", "interview"] else "10-15 mins"
            
            dest_feature = top_goal.goal_type
            if dest_feature == "quiz":
                dest_feature = "knowledge"

            return {
                "title": f"Advance Goal: {top_goal.title}",
                "reason": f"You need {remaining} more completion(s) to hit this week's milestone.",
                "estimated_duration": est_minutes,
                "action_label": f"Complete {top_goal.goal_type.title()} Task",
                "target_feature": dest_feature,
                "is_completed": False,
                "category": top_goal.goal_type
            }

        if nba and nba.get("current_priority"):
            return {
                "title": nba["current_priority"],
                "reason": nba["reason"],
                "estimated_duration": "20 mins",
                "action_label": nba.get("cta_label", "Start Practice"),
                "target_feature": nba.get("relevant_module", "coding"),
                "is_completed": False,
                "category": nba.get("relevant_module", "general")
            }

        return {
            "title": "Explore Daily Placement Practice",
            "reason": "Complete a coding exercise or take a domain quiz to build continuous placement readiness.",
            "estimated_duration": "15 mins",
            "action_label": "Start Practicing",
            "target_feature": "coding",
            "is_completed": False,
            "category": "coding"
        }

    @classmethod
    def get_skills_in_progress(cls, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """
        Synthesizes student's actual assessed skills based on:
        - Target role skills from StudentProfile
        - Questions mastered vs learning in UserProgress / QuizAttemptDetail
        - Coding submissions
        """
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        target_role = profile.target_role if profile and profile.target_role else "Software Engineer"
        
        # Role to standard expected competencies
        role_skills_map = {
            "Software Engineer": ["Data Structures & Algorithms", "System Design Basics", "Python / C++", "Database & SQL"],
            "Data Analyst": ["SQL & Relational DBs", "Python for Data", "Statistical Analysis", "Data Visualization"],
            "Machine Learning Engineer": ["Python & NumPy", "Supervised ML", "Data Preprocessing", "Neural Networks"],
            "Product Analyst": ["Business Metrics", "SQL Analysis", "A/B Testing", "Aptitude & Problem Solving"],
            "Cyber Security Analyst": ["Network Security", "Cryptography Basics", "Linux Administration", "Web Security"]
        }

        default_skills = role_skills_map.get(target_role, ["Data Structures & Algorithms", "Python Programming", "SQL & Database", "Quantitative Aptitude"])
        
        # Query actual quiz progress for user
        progress_records = db.query(UserProgress).filter(UserProgress.user_id == str(user_id)).all()
        mastered_count = sum(1 for p in progress_records if p.status == "mastered")
        learning_count = sum(1 for p in progress_records if p.status == "learning")

        # Query accepted coding submissions
        accepted_subs = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted")
            .count()
        )

        skills_result = []
        for idx, skill in enumerate(default_skills):
            # Derive status based on real activity
            if idx == 0 and accepted_subs > 0:
                skills_result.append({
                    "skill_name": skill,
                    "status": "Practicing",
                    "activity_count": f"{accepted_subs} problems solved",
                    "level": "Active",
                    "target_feature": "coding"
                })
            elif idx == 1 and (mastered_count > 0 or learning_count > 0):
                skills_result.append({
                    "skill_name": skill,
                    "status": "Assessed",
                    "activity_count": f"{mastered_count + learning_count} quiz questions",
                    "level": "In Review",
                    "target_feature": "knowledge"
                })
            else:
                skills_result.append({
                    "skill_name": skill,
                    "status": "Target Skill",
                    "activity_count": "Ready for practice",
                    "level": "Planned",
                    "target_feature": "roadmap"
                })

        return skills_result

    @classmethod
    def get_recent_activities(cls, db: Session, user_id: int, limit: int = 8) -> List[Dict[str, Any]]:
        activities = []

        # 1. Resumes
        resumes = (
            db.query(ResumeUpload)
            .filter(ResumeUpload.user_id == user_id)
            .order_by(desc(ResumeUpload.uploaded_at))
            .limit(4)
            .all()
        )
        for r in resumes:
            score_str = f"Score: {int(r.ats_score)}/100" if r.ats_score is not None else "Parsed"
            activities.append({
                "id": f"resume-{r.id}",
                "module": "resume",
                "title": f"ATS Resume Analysis — {r.original_filename}",
                "description": f"Analyzed resume version {r.version}. ATS {score_str}.",
                "timestamp": r.uploaded_at.isoformat(),
                "status": "completed",
                "score": r.ats_score,
                "action_label": "Review Analysis",
                "target_feature": "resume"
            })

        # 2. Coding Submissions
        submissions = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.user_id == user_id)
            .order_by(desc(CodingSubmission.submitted_at))
            .limit(5)
            .all()
        )
        for s in submissions:
            is_acc = s.status.lower() == "accepted"
            activities.append({
                "id": f"coding-{s.id}",
                "module": "coding",
                "title": f"Problem #{s.question_id} ({s.language.title()})",
                "description": f"Status: {s.status} — {s.passed_testcases}/{s.total_testcases} testcases passed.",
                "timestamp": s.submitted_at.isoformat(),
                "status": "completed" if is_acc else "failed",
                "score": s.code_quality_score,
                "action_label": "Practice Again" if not is_acc else "Continue Coding",
                "target_feature": "coding"
            })

        # 3. Quiz Attempts
        quizzes = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == str(user_id))
            .order_by(desc(QuizAttempt.submitted_at))
            .limit(4)
            .all()
        )
        for q in quizzes:
            activities.append({
                "id": f"quiz-{q.attempt_id}",
                "module": "knowledge",
                "title": f"{q.domain} Quiz Attempt",
                "description": f"Scored {q.score}/{q.total_questions} ({round(q.percentage, 1)}%)",
                "timestamp": q.submitted_at.isoformat(),
                "status": "completed" if q.percentage >= 60 else "review_needed",
                "score": q.percentage,
                "action_label": "Take Quiz",
                "target_feature": "knowledge"
            })

        # 4. Mock Interviews
        interviews = (
            db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .order_by(desc(InterviewSession.created_at))
            .limit(3)
            .all()
        )
        for i in interviews:
            activities.append({
                "id": f"interview-{i.id}",
                "module": "interview",
                "title": f"{i.interview_type} Mock Interview",
                "description": f"Status: {i.status}" + (f" — Overall Score: {i.overall_score}/100" if i.overall_score else ""),
                "timestamp": i.created_at.isoformat(),
                "status": "completed" if i.status.lower() == "completed" else "in_progress",
                "score": i.overall_score,
                "action_label": "View Interview",
                "target_feature": "interview"
            })

        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        return activities[:limit]

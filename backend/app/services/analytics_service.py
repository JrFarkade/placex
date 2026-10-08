"""
PlaceX Analytics Service.
Handles analytics aggregation across Overview, Learning, Skills, and Placement tabs.
Uses actual database records from StudentDailyActivity, WeeklyGoal, CodingSubmission,
QuizAttempt, InterviewSession, ResumeUpload, StudentRoadmapProgress, UserProgress, and StudentProfile.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from app.models.dashboard import StudentDailyActivity, WeeklyGoal
from app.models.coding import CodingSubmission, CodingQuestion
from app.models.quiz import QuizAttempt, QuizAttemptDetail, Question, UserProgress
from app.models.interview import InterviewSession
from app.models.resume import ResumeUpload
from app.models.learning import StudentRoadmapProgress
from app.models.profile import StudentProfile
from app.learning_engine.placement.readiness_engine import ReadinessEngine
from app.services.dashboard_service import DashboardService


class AnalyticsService:

    @classmethod
    def get_overview_analytics(cls, db: Session, user_id: int, days_count: int = 30) -> Dict[str, Any]:
        """
        Synthesizes student overview data for selected date range:
        - Summary cards (login streak, learning streak, active days, goals completed, problem/quiz/interview counts)
        - Daily activity chart (broken down by module category)
        - Current weekly goals
        - Chronological recent activity list
        - Today's focus / recommended action
        """
        today = date.today()
        start_date = today - timedelta(days=days_count - 1)
        start_dt = datetime.combine(start_date, datetime.min.time())

        # Ensure today's activity record exists
        DashboardService.record_activity(db, user_id, is_login=False)

        # 1. Fetch all student daily activities
        all_activities = (
            db.query(StudentDailyActivity)
            .filter(StudentDailyActivity.user_id == user_id)
            .order_by(StudentDailyActivity.activity_date.asc())
            .all()
        )

        active_dates_set = {a.activity_date for a in all_activities if (a.actions_count > 0 or a.login_count > 0)}
        activity_by_date = {a.activity_date: (a.actions_count, a.login_count) for a in all_activities}

        # 2. Login Streak Calculation
        current_login_streak = 0
        check_date = today
        if check_date not in active_dates_set:
            check_date = today - timedelta(days=1)

        while check_date in active_dates_set:
            current_login_streak += 1
            check_date -= timedelta(days=1)

        longest_login_streak = 0
        if active_dates_set:
            sorted_dates = sorted(list(active_dates_set))
            running = 0
            prev = None
            for d in sorted_dates:
                if prev is None or d == prev + timedelta(days=1):
                    running += 1
                elif d > prev + timedelta(days=1):
                    running = 1
                if running > longest_login_streak:
                    longest_login_streak = running
                prev = d

        # Active days in period
        active_days_in_period = sum(1 for d in active_dates_set if d >= start_date)

        # 3. Aggregated counts across modules
        coding_solved_count = (
            db.query(func.count(CodingSubmission.id))
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted")
            .scalar() or 0
        )

        coding_attempted_count = (
            db.query(func.count(CodingSubmission.id))
            .filter(CodingSubmission.user_id == user_id)
            .scalar() or 0
        )

        quiz_attempted_count = (
            db.query(func.count(QuizAttempt.attempt_id))
            .filter(QuizAttempt.user_id == str(user_id))
            .scalar() or 0
        )

        interview_completed_count = (
            db.query(func.count(InterviewSession.id))
            .filter(InterviewSession.user_id == user_id, InterviewSession.status == "Completed")
            .scalar() or 0
        )

        resume_uploaded_count = (
            db.query(func.count(ResumeUpload.id))
            .filter(ResumeUpload.user_id == user_id)
            .scalar() or 0
        )

        # 4. Weekly Goals
        weekly_goals = DashboardService.get_or_create_weekly_goals(db, user_id)
        goals_completed_count = sum(1 for g in weekly_goals if g.get("is_completed", False))

        # 5. Time-Series Daily Activity Chart Data for selected period
        # Map timestamped events to dates for module breakdown
        coding_subs = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.submitted_at >= start_dt)
            .all()
        )
        quiz_atts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == str(user_id), QuizAttempt.submitted_at >= start_dt)
            .all()
        )
        interviews = (
            db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id, InterviewSession.created_at >= start_dt)
            .all()
        )
        resumes = (
            db.query(ResumeUpload)
            .filter(ResumeUpload.user_id == user_id, ResumeUpload.uploaded_at >= start_dt)
            .all()
        )

        daily_breakdown: Dict[date, Dict[str, int]] = {}
        curr = start_date
        while curr <= today:
            daily_breakdown[curr] = {"coding": 0, "quiz": 0, "interview": 0, "resume": 0, "total": 0}
            curr += timedelta(days=1)

        for s in coding_subs:
            d = s.submitted_at.date()
            if d in daily_breakdown:
                daily_breakdown[d]["coding"] += 1
                daily_breakdown[d]["total"] += 1

        for q in quiz_atts:
            if q.submitted_at:
                d = q.submitted_at.date()
                if d in daily_breakdown:
                    daily_breakdown[d]["quiz"] += 1
                    daily_breakdown[d]["total"] += 1

        for i in interviews:
            d = i.created_at.date()
            if d in daily_breakdown:
                daily_breakdown[d]["interview"] += 1
                daily_breakdown[d]["total"] += 1

        for r in resumes:
            d = r.uploaded_at.date()
            if d in daily_breakdown:
                daily_breakdown[d]["resume"] += 1
                daily_breakdown[d]["total"] += 1

        activity_chart_data = []
        curr = start_date
        while curr <= today:
            b = daily_breakdown[curr]
            activity_chart_data.append({
                "date": curr.isoformat(),
                "display_date": curr.strftime("%b %d"),
                "coding": b["coding"],
                "quiz": b["quiz"],
                "interview": b["interview"],
                "resume": b["resume"],
                "total": b["total"]
            })
            curr += timedelta(days=1)

        # 6. Recent Activities & Today's Focus
        recent_activities = DashboardService.get_recent_activities(db, user_id, limit=6)
        todays_focus = DashboardService.get_todays_focus(db, user_id)

        return {
            "days_period": days_count,
            "summary_cards": {
                "current_login_streak": current_login_streak,
                "longest_login_streak": max(longest_login_streak, current_login_streak),
                "active_days_in_period": active_days_in_period,
                "total_active_days": len(active_dates_set),
                "goals_completed_count": goals_completed_count,
                "coding_solved_count": coding_solved_count,
                "coding_attempted_count": coding_attempted_count,
                "quiz_attempted_count": quiz_attempted_count,
                "interview_completed_count": interview_completed_count,
                "resume_uploaded_count": resume_uploaded_count
            },
            "activity_chart_data": activity_chart_data,
            "weekly_goals": weekly_goals,
            "recent_activities": recent_activities,
            "todays_focus": todays_focus
        }

    @classmethod
    def get_learning_analytics(cls, db: Session, user_id: int, days_count: int = 30) -> Dict[str, Any]:
        """
        Synthesizes Learning engagement data:
        - Animated 7-day tracker for current week (Mon-Sun)
        - Activity heatmap grid for selected days (30, 90, 365)
        - Learning trends time-series
        - Achievement milestones
        """
        today = date.today()
        start_date = today - timedelta(days=days_count - 1)
        start_dt = datetime.combine(start_date, datetime.min.time())

        # Ensure today activity recorded
        DashboardService.record_activity(db, user_id, is_login=False)

        # Streak data & 7-day tracker
        streak_data = DashboardService.get_streak_and_calendar(db, user_id, days_count=days_count)

        # Query all learning events for heatmap & category breakdown
        coding_subs = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.user_id == user_id)
            .all()
        )
        quiz_atts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == str(user_id))
            .all()
        )
        interviews = (
            db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .all()
        )
        resumes = (
            db.query(ResumeUpload)
            .filter(ResumeUpload.user_id == user_id)
            .all()
        )

        learning_dates_map: Dict[date, Dict[str, Any]] = {}

        def add_event(evt_date: date, category: str):
            if evt_date not in learning_dates_map:
                learning_dates_map[evt_date] = {
                    "date": evt_date.isoformat(),
                    "total_count": 0,
                    "categories": {"coding": 0, "quiz": 0, "interview": 0, "resume": 0}
                }
            learning_dates_map[evt_date]["total_count"] += 1
            if category in learning_dates_map[evt_date]["categories"]:
                learning_dates_map[evt_date]["categories"][category] += 1

        for s in coding_subs:
            add_event(s.submitted_at.date(), "coding")

        for q in quiz_atts:
            if q.submitted_at:
                add_event(q.submitted_at.date(), "quiz")

        for i in interviews:
            add_event(i.created_at.date(), "interview")

        for r in resumes:
            add_event(r.uploaded_at.date(), "resume")

        # Build Heatmap cells for start_date through today
        heatmap_cells = []
        curr = start_date
        while curr <= today:
            entry = learning_dates_map.get(curr)
            cnt = entry["total_count"] if entry else 0
            if cnt == 0:
                lvl = 0
            elif cnt == 1:
                lvl = 1
            elif cnt <= 3:
                lvl = 2
            elif cnt <= 5:
                lvl = 3
            else:
                lvl = 4

            heatmap_cells.append({
                "date": curr.isoformat(),
                "display_date": curr.strftime("%b %d, %Y"),
                "count": cnt,
                "level": lvl,
                "categories": entry["categories"] if entry else {"coding": 0, "quiz": 0, "interview": 0, "resume": 0},
                "is_today": curr == today
            })
            curr += timedelta(days=1)

        # Calculate week-over-week change
        mon_this_week = DashboardService.get_start_of_week(today)
        mon_prev_week = mon_this_week - timedelta(days=7)

        count_this_week = sum(
            1 for d, data in learning_dates_map.items()
            if mon_this_week <= d < mon_this_week + timedelta(days=7)
        )
        count_prev_week = sum(
            1 for d, data in learning_dates_map.items()
            if mon_prev_week <= d < mon_this_week
        )

        wow_pct_change = 0.0
        if count_prev_week > 0:
            wow_pct_change = round(((count_this_week - count_prev_week) / count_prev_week) * 100.0, 1)
        elif count_this_week > 0:
            wow_pct_change = 100.0

        # Calculate Milestones
        coding_solved = sum(1 for s in coding_subs if s.status == "Accepted")
        quizzes_done = len(quiz_atts)
        interviews_done = sum(1 for i in interviews if i.status == "Completed")
        resumes_done = len(resumes)
        longest_streak = streak_data.get("longest_streak", 0)

        milestones = [
            {
                "id": "m-quiz-1",
                "title": "First Quiz Completed",
                "description": "Completed your first Knowledge Base domain assessment.",
                "category": "quiz",
                "is_earned": quizzes_done >= 1,
                "badge_icon": "BookOpen",
                "earned_text": "Earned" if quizzes_done >= 1 else "In Progress (0/1)"
            },
            {
                "id": "m-code-1",
                "title": "Problem Solver",
                "description": "Successfully solved your first technical coding challenge.",
                "category": "coding",
                "is_earned": coding_solved >= 1,
                "badge_icon": "Code2",
                "earned_text": "Earned" if coding_solved >= 1 else "In Progress (0/1)"
            },
            {
                "id": "m-interview-1",
                "title": "Interview Candidate",
                "description": "Completed a full Technical, HR, or Viva mock interview session.",
                "category": "interview",
                "is_earned": interviews_done >= 1,
                "badge_icon": "Video",
                "earned_text": "Earned" if interviews_done >= 1 else "In Progress (0/1)"
            },
            {
                "id": "m-streak-7",
                "title": "7-Day Active Streak",
                "description": "Maintained continuous platform engagement for 7 consecutive days.",
                "category": "streak",
                "is_earned": longest_streak >= 7,
                "badge_icon": "Flame",
                "earned_text": "Earned" if longest_streak >= 7 else f"In Progress ({longest_streak}/7 days)"
            },
            {
                "id": "m-resume-1",
                "title": "ATS Optimized",
                "description": "Uploaded and analyzed your engineering resume.",
                "category": "resume",
                "is_earned": resumes_done >= 1,
                "badge_icon": "FileText",
                "earned_text": "Earned" if resumes_done >= 1 else "In Progress (0/1)"
            }
        ]

        return {
            "seven_day_tracker": streak_data.get("seven_day_tracker", []),
            "current_streak": streak_data.get("current_streak", 0),
            "longest_streak": streak_data.get("longest_streak", 0),
            "active_days_this_week": streak_data.get("active_days_this_week", 0),
            "motivational_message": streak_data.get("motivational_message", ""),
            "count_this_week": count_this_week,
            "count_prev_week": count_prev_week,
            "wow_pct_change": wow_pct_change,
            "heatmap": heatmap_cells,
            "milestones": milestones
        }

    @classmethod
    def get_skills_analytics(cls, db: Session, user_id: int, days_count: int = 30) -> Dict[str, Any]:
        """
        Synthesizes Skills performance data:
        - Domain Quiz performance (bar chart data)
        - Skill Radar chart dimensions (5 core engineering pillars)
        - Coding Sandbox language & difficulty distribution
        - Identified Strengths & Weaknesses
        """
        start_date = date.today() - timedelta(days=days_count - 1)
        start_dt = datetime.combine(start_date, datetime.min.time())

        # 1. Domain Quiz Performance
        domains = ["Aptitude", "SoftwareEngineering", "AIML", "DataScience", "CyberSecurity"]
        domain_labels = {
            "Aptitude": "Aptitude & Logic",
            "SoftwareEngineering": "Software Eng",
            "AIML": "AI & ML",
            "DataScience": "Data Science",
            "CyberSecurity": "Cyber Security"
        }

        quiz_attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == str(user_id))
            .all()
        )

        domain_stats: Dict[str, Dict[str, Any]] = {
            d: {"domain": d, "label": domain_labels.get(d, d), "attempts": 0, "total_questions": 0, "score": 0, "accuracy": 0.0}
            for d in domains
        }

        for q in quiz_attempts:
            # Handle multi-domain strings e.g. "AIML,Aptitude"
            d_keys = [d.strip() for d in q.domain.split(",") if d.strip() in domain_stats]
            if not d_keys:
                d_keys = ["Aptitude"]
            for dk in d_keys:
                ds = domain_stats[dk]
                ds["attempts"] += 1
                ds["total_questions"] += q.total_questions
                ds["score"] += q.score

        domain_chart = []
        total_quiz_questions = 0
        for d in domains:
            ds = domain_stats[d]
            if ds["total_questions"] > 0:
                ds["accuracy"] = round((ds["score"] / ds["total_questions"]) * 100.0, 1)
            total_quiz_questions += ds["total_questions"]
            domain_chart.append(ds)

        # 2. Coding Progress
        coding_subs = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.user_id == user_id)
            .all()
        )

        accepted_subs = [s for s in coding_subs if s.status == "Accepted"]
        total_coding_subs = len(coding_subs)
        solved_coding = len(accepted_subs)
        coding_accuracy = round((solved_coding / total_coding_subs) * 100.0, 1) if total_coding_subs > 0 else 0.0

        # Language breakdown
        lang_counts: Dict[str, int] = {}
        for s in coding_subs:
            lang = s.language.title() if s.language else "Python"
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

        lang_chart = [{"language": l, "count": c} for l, c in lang_counts.items()]

        # Difficulty breakdown based on Question records
        solved_q_ids = list(set(s.question_id for s in accepted_subs))
        solved_questions = (
            db.query(CodingQuestion)
            .filter(CodingQuestion.id.in_(solved_q_ids))
            .all() if solved_q_ids else []
        )

        diff_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
        for q in solved_questions:
            d = q.difficulty if q.difficulty in diff_counts else "Medium"
            diff_counts[d] += 1

        # 3. Skill Radar Chart (5 Core Dimensions)
        # Dimensions: DSA & Problem Solving, System & Architecture, AI & Data Science, Databases & SQL, Aptitude & Logic
        # Calculate real score (0-100) per dimension based on assessment evidence
        has_enough_data = (total_quiz_questions > 0 or total_coding_subs > 0)

        # DSA dimension score
        dsa_score = min(100.0, (solved_coding / 10.0) * 100.0) if solved_coding > 0 else 0.0
        if domain_stats["SoftwareEngineering"]["total_questions"] > 0:
            dsa_score = round((dsa_score * 0.5) + (domain_stats["SoftwareEngineering"]["accuracy"] * 0.5), 1)

        # System dimension score
        sys_score = domain_stats["SoftwareEngineering"]["accuracy"] if domain_stats["SoftwareEngineering"]["total_questions"] > 0 else (60.0 if solved_coding > 2 else 0.0)

        # AI & Data Science dimension score
        ai_acc = domain_stats["AIML"]["accuracy"] if domain_stats["AIML"]["total_questions"] > 0 else 0.0
        ds_acc = domain_stats["DataScience"]["accuracy"] if domain_stats["DataScience"]["total_questions"] > 0 else 0.0
        ai_score = round((ai_acc + ds_acc) / 2.0, 1) if (ai_acc > 0 or ds_acc > 0) else 0.0

        # Databases dimension score
        db_score = domain_stats["DataScience"]["accuracy"] if domain_stats["DataScience"]["total_questions"] > 0 else (70.0 if solved_coding > 1 else 0.0)

        # Aptitude dimension score
        apt_score = domain_stats["Aptitude"]["accuracy"] if domain_stats["Aptitude"]["total_questions"] > 0 else 0.0

        radar_data = [
            {"subject": "DSA & Logic", "score": dsa_score, "fullMark": 100},
            {"subject": "Software Eng", "score": sys_score, "fullMark": 100},
            {"subject": "AI & ML", "score": ai_score, "fullMark": 100},
            {"subject": "Data Science", "score": db_score, "fullMark": 100},
            {"subject": "Aptitude", "score": apt_score, "fullMark": 100}
        ]

        # 4. Strengths & Weaknesses Identification
        strengths = []
        weaknesses = []

        if solved_coding >= 3:
            strengths.append({
                "title": "Algorithmic Execution",
                "description": f"Solved {solved_coding} technical coding problems with {coding_accuracy}% success rate.",
                "category": "coding",
                "target_feature": "coding"
            })
        
        for d in domains:
            ds = domain_stats[d]
            if ds["total_questions"] >= 5:
                if ds["accuracy"] >= 70.0:
                    strengths.append({
                        "title": f"Strong Accuracy: {ds['label']}",
                        "description": f"Achieved {ds['accuracy']}% accuracy across {ds['total_questions']} questions.",
                        "category": "quiz",
                        "target_feature": "knowledge"
                    })
                elif ds["accuracy"] < 50.0:
                    weaknesses.append({
                        "title": f"Needs Focus: {ds['label']}",
                        "description": f"Current accuracy is {ds['accuracy']}%. Re-attempt quiz questions to build mastery.",
                        "category": "quiz",
                        "target_feature": "knowledge"
                    })

        if not strengths:
            strengths.append({
                "title": "Placement Foundation Ready",
                "description": "Complete quizzes and coding challenges to unlock your top strength breakdown.",
                "category": "general",
                "target_feature": "coding"
            })

        if not weaknesses:
            weaknesses.append({
                "title": "Practice Variety Recommended",
                "description": "Attempt assessments across multiple domains to identify target growth areas.",
                "category": "general",
                "target_feature": "knowledge"
            })

        return {
            "domain_performance": domain_chart,
            "radar_data": radar_data,
            "has_enough_radar_data": has_enough_data,
            "coding_metrics": {
                "total_attempted": total_coding_subs,
                "total_solved": solved_coding,
                "accuracy": coding_accuracy,
                "languages": lang_chart,
                "difficulty_distribution": diff_counts
            },
            "strengths": strengths,
            "weaknesses": weaknesses
        }

    @classmethod
    def get_placement_analytics(cls, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Synthesizes Placement readiness data:
        - ATS Resume history and Mode B score trends
        - Mock Interview session history & competency scores
        - Compact Coding & Quiz prep summary
        - Placement Readiness Score (0-100 & 5-tier level)
        """
        # 1. ATS Resume History
        resumes = (
            db.query(ResumeUpload)
            .filter(ResumeUpload.user_id == user_id)
            .order_by(desc(ResumeUpload.uploaded_at))
            .all()
        )

        latest_resume = resumes[0] if resumes else None
        resume_history = []
        for r in resumes:
            resume_history.append({
                "id": r.id,
                "filename": r.original_filename,
                "file_type": r.file_type.upper() if r.file_type else "PDF",
                "version": r.version,
                "uploaded_at": r.uploaded_at.strftime("%b %d, %Y"),
                "ats_score": r.ats_score or 0.0
            })

        # 2. Mock Interview Progress
        interviews = (
            db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .order_by(desc(InterviewSession.created_at))
            .all()
        )

        completed_interviews = [i for i in interviews if i.status == "Completed"]

        # Competency score averages across completed sessions
        competencies = {
            "Communication": [],
            "Technical Knowledge": [],
            "Problem Solving": [],
            "Confidence": [],
            "Behavioral Alignment": []
        }

        for i in completed_interviews:
            bd = i.score_breakdown or {}
            for k in competencies:
                if k in bd and isinstance(bd[k], (int, float)):
                    competencies[k].append(float(bd[k]))

        avg_competencies = []
        for k, vals in competencies.items():
            avg_score = round(sum(vals) / len(vals), 1) if vals else 0.0
            avg_competencies.append({
                "competency": k,
                "score": avg_score,
                "has_data": len(vals) > 0
            })

        interview_history = []
        for i in interviews:
            interview_history.append({
                "id": i.id,
                "interview_type": i.interview_type,
                "target_company": i.target_company or "General",
                "status": i.status,
                "created_at": i.created_at.strftime("%b %d, %Y"),
                "overall_score": i.overall_score or 0.0
            })

        # 3. Placement Readiness Calculation (Reuses PlaceX ReadinessEngine)
        coding_solved = (
            db.query(func.count(CodingSubmission.id))
            .filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted")
            .scalar() or 0
        )

        latest_resume_score = latest_resume.ats_score if latest_resume else None
        latest_interview_score = completed_interviews[0].overall_score if completed_interviews else 0.0

        readiness = ReadinessEngine.calculate_readiness(
            resume_score=latest_resume_score,
            coding_solved=coding_solved,
            interview_score=latest_interview_score
        )

        return {
            "latest_resume": {
                "filename": latest_resume.original_filename if latest_resume else None,
                "ats_score": latest_resume.ats_score if latest_resume else None,
                "uploaded_at": latest_resume.uploaded_at.strftime("%b %d, %Y") if latest_resume else None
            } if latest_resume else None,
            "resume_history": resume_history,
            "total_interviews": len(interviews),
            "completed_interviews": len(completed_interviews),
            "avg_competencies": avg_competencies,
            "interview_history": interview_history,
            "readiness": readiness
        }

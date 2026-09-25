import os
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.learning_engine.roadmap.dag_builder import DAGBuilder
from app.learning_engine.placement.readiness_engine import ReadinessEngine, COMPANY_PROFILES
from app.models.resume import ResumeUpload
from app.models.coding import CodingSubmission
from app.models.interview import InterviewSession
from app.models.profile import StudentProfile
from app.models.learning import StudentRoadmapProgress

ROADMAP_DATA_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "roadmap_docx_data.json"
)

class LearningService:
    """
    Main Learning Intelligence Service handling personalized career roadmaps, skill gap analysis, and next best actions.
    Now backed by 288 weeks of official reference DOCX curriculum across 4 branches & 3 levels.
    """

    _cached_data = None

    @classmethod
    def _load_docx_data(cls) -> Dict[str, Any]:
        if cls._cached_data is None:
            if os.path.exists(ROADMAP_DATA_PATH):
                with open(ROADMAP_DATA_PATH, "r", encoding="utf-8") as f:
                    cls._cached_data = json.load(f)
            else:
                cls._cached_data = {}
        return cls._cached_data

    @classmethod
    def get_branches_and_levels(cls) -> Dict[str, Any]:
        data = cls._load_docx_data()
        branches = list(data.keys())
        levels = ["Beginner", "Intermediate", "Advanced"]
        return {
            "branches": branches,
            "levels": levels,
            "default_branch": branches[0] if branches else "Data Science",
            "default_level": "Beginner"
        }

    @classmethod
    def get_docx_roadmap(
        cls,
        db: Session,
        user_id: int,
        branch: Optional[str] = None,
        level: Optional[str] = None
    ) -> Dict[str, Any]:
        data = cls._load_docx_data()
        all_branches = list(data.keys())
        
        selected_branch = branch if (branch and branch in data) else (all_branches[0] if all_branches else "Data Science")
        selected_level = level if (level in ["Beginner", "Intermediate", "Advanced"]) else "Beginner"

        raw_weeks = data.get(selected_branch, {}).get(selected_level, [])

        # Fetch student progress record
        progress_record = db.query(StudentRoadmapProgress).filter(
            StudentRoadmapProgress.user_id == user_id,
            StudentRoadmapProgress.branch == selected_branch,
            StudentRoadmapProgress.level == selected_level
        ).first()

        completed_set = set(progress_record.completed_weeks if (progress_record and progress_record.completed_weeks) else [])
        in_progress_set = set(progress_record.in_progress_weeks if (progress_record and progress_record.in_progress_weeks) else [])

        processed_weeks = []
        completed_count = 0
        in_progress_count = 0

        for w in raw_weeks:
            wk_num = w["week"]
            if wk_num in completed_set:
                wk_status = "Completed"
                completed_count += 1
            elif wk_num in in_progress_set:
                wk_status = "In Progress"
                in_progress_count += 1
            else:
                wk_status = "Not Started"

            processed_weeks.append({
                **w,
                "status": wk_status
            })

        total_weeks = len(processed_weeks)
        progress_pct = round((completed_count / total_weeks * 100), 1) if total_weeks > 0 else 0.0

        # Also get readiness score
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        latest_resume = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(ResumeUpload.uploaded_at.desc()).first()
        coding_subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted").count()
        latest_interview = db.query(InterviewSession).filter(InterviewSession.user_id == user_id, InterviewSession.status == "Completed").order_by(InterviewSession.created_at.desc()).first()

        resume_score = latest_resume.ats_score if latest_resume else None
        interview_score = latest_interview.overall_score if latest_interview else 0.0

        readiness = ReadinessEngine.calculate_readiness(
            resume_score=resume_score,
            coding_solved=coding_subs,
            interview_score=interview_score
        )

        return {
            "branch": selected_branch,
            "level": selected_level,
            "total_weeks": total_weeks,
            "completed_count": completed_count,
            "in_progress_count": in_progress_count,
            "progress_pct": progress_pct,
            "weeks": processed_weeks,
            "readiness": readiness,
            "available_branches": all_branches,
            "available_levels": ["Beginner", "Intermediate", "Advanced"]
        }

    @classmethod
    def update_week_status(
        cls,
        db: Session,
        user_id: int,
        branch: str,
        level: str,
        week_num: int,
        status: str
    ) -> Dict[str, Any]:
        progress = db.query(StudentRoadmapProgress).filter(
            StudentRoadmapProgress.user_id == user_id,
            StudentRoadmapProgress.branch == branch,
            StudentRoadmapProgress.level == level
        ).first()

        if not progress:
            progress = StudentRoadmapProgress(
                user_id=user_id,
                branch=branch,
                level=level,
                completed_weeks=[],
                in_progress_weeks=[]
            )
            db.add(progress)

        completed = list(progress.completed_weeks or [])
        in_progress = list(progress.in_progress_weeks or [])

        # Remove from both
        completed = [w for w in completed if w != week_num]
        in_progress = [w for w in in_progress if w != week_num]

        if status == "Completed":
            completed.append(week_num)
        elif status == "In Progress":
            in_progress.append(week_num)

        progress.completed_weeks = completed
        progress.in_progress_weeks = in_progress
        db.commit()

        return cls.get_docx_roadmap(db=db, user_id=user_id, branch=branch, level=level)

    @classmethod
    def get_roadmap_and_plan(
        cls,
        db: Session,
        user_id: int,
        target_role: Optional[str] = None,
        target_company: Optional[str] = None
    ) -> Dict[str, Any]:
        # Legacy compatibility method
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        latest_resume = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(ResumeUpload.uploaded_at.desc()).first()
        coding_subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted").count()
        latest_interview = db.query(InterviewSession).filter(InterviewSession.user_id == user_id, InterviewSession.status == "Completed").order_by(InterviewSession.created_at.desc()).first()

        selected_role = target_role or (profile.target_role if profile and profile.target_role else None)
        selected_company = target_company or (profile.target_company if profile and profile.target_company else None)

        mastered_skills = profile.skills if (profile and profile.skills) else []
        if latest_resume and latest_resume.parsed_data:
            parsed_skills = latest_resume.parsed_data.get("parsed_schema", {}).get("skills", [])
            mastered_skills = list(set(mastered_skills + parsed_skills))

        phases = DAGBuilder.get_prerequisite_roadmap(target_role=selected_role, mastered_skills=mastered_skills)

        total_topics = 0
        completed_topics = 0
        next_best_action = None

        for phase in phases:
            for top in phase["topics"]:
                total_topics += 1
                if top["status"] == "Completed":
                    completed_topics += 1
                elif next_best_action is None:
                    next_best_action = {
                        "phase_name": phase["name"],
                        "topic_name": top["name"],
                        "reason": top["reason"],
                        "estimated_time": "1-2 hours"
                    }

        progress_pct = round((completed_topics / total_topics * 100), 1) if total_topics > 0 else 0.0

        if next_best_action is None:
            next_best_action = {
                "phase_name": "Placement Readiness",
                "topic_name": "Attempt Mock Placement Interview",
                "reason": "You've completed all topics in your roadmap! Time to test your readiness in a full mock interview.",
                "estimated_time": "30 mins"
            }

        resume_score = latest_resume.ats_score if latest_resume else None
        interview_score = latest_interview.overall_score if latest_interview else 0.0

        readiness = ReadinessEngine.calculate_readiness(
            resume_score=resume_score,
            coding_solved=coding_subs,
            interview_score=interview_score
        )

        company_info = COMPANY_PROFILES.get(selected_company, {}) if selected_company else {}

        has_activity = (selected_role is not None) or (latest_resume is not None) or (coding_subs > 0) or (latest_interview is not None)

        return {
            "status": "Active" if has_activity else "No roadmap generated",
            "target_role": selected_role or "Not specified",
            "target_company": selected_company or "Not specified",
            "progress_pct": progress_pct,
            "completed_topics_count": completed_topics,
            "total_topics_count": total_topics,
            "next_best_action": next_best_action,
            "readiness": readiness,
            "phases": phases,
            "company_profile": company_info,
            "mastered_skills": mastered_skills
        }


from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.learning_engine.roadmap.dag_builder import DAGBuilder
from app.learning_engine.placement.readiness_engine import ReadinessEngine, COMPANY_PROFILES
from app.models.resume import ResumeUpload
from app.models.coding import CodingSubmission
from app.models.interview import InterviewSession
from app.models.profile import StudentProfile

class LearningService:
    """
    Main Learning Intelligence Service handling personalized career roadmaps, skill gap analysis, and next best actions.
    """

    @classmethod
    def get_roadmap_and_plan(
        cls,
        db: Session,
        user_id: int,
        target_role: Optional[str] = None,
        target_company: Optional[str] = None
    ) -> Dict[str, Any]:
        # 1. Fetch real student records & memory profile
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

        # 2. Build Role-Specific Roadmap Phases & Filter Mastered Skills
        phases = DAGBuilder.get_prerequisite_roadmap(target_role=selected_role, mastered_skills=mastered_skills)

        # 3. Calculate Overall Progress & Identify Next Best Action
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

        # 4. Calculate Readiness Score
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

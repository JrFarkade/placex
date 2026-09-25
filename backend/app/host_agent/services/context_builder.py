from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.profile import StudentProfile
from app.models.resume import ResumeUpload
from app.models.quiz import QuizAttempt, QuizAttemptDetail, UserProgress, Question
from app.models.coding import CodingSubmission, CodingQuestion
from app.models.interview import InterviewSession
from app.models.learning import PlacementReadiness, LearningRoadmap, StudentRoadmapProgress
from app.host_agent.memory.memory_manager import MemoryManager

class StudentContextBuilder:
    """
    Aggregates real student metrics across all PlaceX modules from placex.db
    to provide the Host Agent with complete 360-degree context.
    """

    @staticmethod
    def build_student_context(db: Session, user_id: int) -> Dict[str, Any]:
        # 1. User & Profile
        user = db.query(User).filter(User.id == user_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        memory = MemoryManager.get_memory(db, user_id)
        long_term = memory.get("long_term", {})

        student_name = user.full_name if user else "Student"
        target_role = (profile.target_role if profile and profile.target_role else long_term.get("target_role")) or "Software Engineer / Data Analyst"
        target_company = (profile.target_company if profile and profile.target_company else long_term.get("target_company")) or None
        university = profile.university if profile else None
        branch = profile.branch if profile else None
        cgpa = profile.cgpa if profile else None
        skills = (profile.skills if profile and profile.skills else long_term.get("skills", [])) or []

        # 2. Resume / ATS Data
        latest_resume = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(ResumeUpload.uploaded_at.desc()).first()
        resume_data = {
            "has_resume": latest_resume is not None,
            "ats_score": latest_resume.ats_score if latest_resume else None,
            "version": latest_resume.version if latest_resume else None,
            "filename": latest_resume.original_filename if latest_resume else None,
            "ats_breakdown": latest_resume.ats_breakdown if latest_resume else {}
        }

        # 3. Knowledge Base / Quiz Progress
        attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == str(user_id)).all()
        quiz_count = len(attempts)
        quiz_avg_score = round(sum(a.percentage for a in attempts) / quiz_count, 1) if quiz_count > 0 else None

        progress_records = db.query(UserProgress).filter(UserProgress.user_id == str(user_id)).all()
        mastered_count = sum(1 for p in progress_records if p.status == "mastered")
        learning_count = sum(1 for p in progress_records if p.status == "learning")

        quiz_data = {
            "total_attempts": quiz_count,
            "average_score": quiz_avg_score,
            "mastered_questions": mastered_count,
            "learning_questions": learning_count
        }

        # 4. Coding Sandbox Progress
        coding_subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).all()
        accepted_subs = [s for s in coding_subs if s.status in ["Accepted", "accepted"]]
        unique_solved_questions = len(set(s.question_id for s in accepted_subs))

        coding_data = {
            "total_submissions": len(coding_subs),
            "accepted_submissions": len(accepted_subs),
            "solved_questions_count": unique_solved_questions
        }

        # 5. AI Mock Interview Sessions
        interview_sessions = db.query(InterviewSession).filter(InterviewSession.user_id == user_id).all()
        completed_interviews = [i for i in interview_sessions if i.status == "Completed"]
        avg_interview_score = round(sum(i.overall_score for i in completed_interviews) / len(completed_interviews), 1) if completed_interviews else None

        interview_data = {
            "total_sessions": len(interview_sessions),
            "completed_sessions": len(completed_interviews),
            "average_score": avg_interview_score
        }

        # 6. Placement Readiness Score
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.user_id == user_id).first()
        readiness_data = {
            "score": readiness.readiness_score if readiness else None,
            "level": readiness.readiness_level if readiness else "Not Calculated",
            "breakdown": readiness.score_breakdown if readiness else {}
        }

        # 7. DOCX Career Roadmap Progress
        roadmap_records = db.query(StudentRoadmapProgress).filter(StudentRoadmapProgress.user_id == user_id).all()
        roadmap_summary = []
        for r in roadmap_records:
            roadmap_summary.append({
                "branch": r.branch,
                "level": r.level,
                "completed_weeks": r.completed_weeks or [],
                "in_progress_weeks": r.in_progress_weeks or []
            })

        return {
            "user_id": user_id,
            "student_name": student_name,
            "target_role": target_role,
            "target_company": target_company,
            "university": university,
            "branch": branch,
            "cgpa": cgpa,
            "skills": skills,
            "resume": resume_data,
            "quiz": quiz_data,
            "coding": coding_data,
            "interview": interview_data,
            "readiness": readiness_data,
            "roadmap_progress": roadmap_summary
        }


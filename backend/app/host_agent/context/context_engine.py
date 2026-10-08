"""
PlaceX Host Agent Context Engine.
Deterministically slices and packages high-density, module-specific context
so Gemini reasoning operates with precision without wasteful whole-database dumps.
"""

import os
import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.host_agent.state.state_manager import HostAgentStateManager
from app.models.learning import StudentRoadmapProgress
from app.models.coding import CodingSubmission, CodingQuestion
from app.models.quiz import QuizAttempt, QuizAttemptDetail, Question
from app.models.resume import ResumeUpload
from app.models.interview import InterviewSession
from app.models.memory import StudentMemory

# Cache official roadmap data once
ROADMAP_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "learning_engine", "data", "roadmap_docx_data.json"
)

_OFFICIAL_ROADMAP_CACHE = None

def get_official_roadmap_data() -> Dict[str, Any]:
    global _OFFICIAL_ROADMAP_CACHE
    if _OFFICIAL_ROADMAP_CACHE is None:
        if os.path.exists(ROADMAP_DATA_PATH):
            with open(ROADMAP_DATA_PATH, "r", encoding="utf-8") as f:
                _OFFICIAL_ROADMAP_CACHE = json.load(f)
        else:
            _OFFICIAL_ROADMAP_CACHE = {}
    return _OFFICIAL_ROADMAP_CACHE


class HostAgentContextEngine:
    """
    Constructs targeted contextual packages for each PlaceX module.
    """

    @classmethod
    def get_context_package(
        cls,
        db: Session,
        user_id: int,
        active_module: str = "dashboard",
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entrypoint: Builds student summary + module-specific rich context slice.
        """
        student_state = HostAgentStateManager.get_student_state(db, user_id)
        extra = extra_data or {}

        # Base context that every reasoning turn needs:
        package: Dict[str, Any] = {
            "user_id": user_id,
            "student_name": student_state["full_name"],
            "target_role": student_state["profile"]["target_role"] or "Not Set",
            "target_company": student_state["profile"]["target_company"] or "Not Set",
            "skills": student_state["profile"]["skills"],
            "active_module": active_module,
            "strengths": student_state["strengths"],
            "weak_areas": student_state["weak_areas"],
            "active_tasks_count": len(student_state["tasks"])
        }

        # Build module-specific slice:
        if active_module == "roadmap":
            package["module_context"] = cls._build_roadmap_context(db, user_id, student_state, extra)
        elif active_module == "coding":
            package["module_context"] = cls._build_coding_context(db, user_id, student_state, extra)
        elif active_module in ["quiz", "knowledge"]:
            package["module_context"] = cls._build_quiz_context(db, user_id, student_state, extra)
        elif active_module in ["resume", "ats"]:
            package["module_context"] = cls._build_ats_context(db, user_id, student_state, extra)
        elif active_module == "interview":
            package["module_context"] = cls._build_interview_context(db, user_id, student_state, extra)
        else:
            package["module_context"] = cls._build_dashboard_context(db, user_id, student_state, extra)

        return package

    @classmethod
    def _build_roadmap_context(cls, db: Session, user_id: int, student_state: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
        branch = extra.get("branch") or student_state["active_roadmap"]["branch"] or "Data Science"
        level = extra.get("level") or student_state["active_roadmap"]["level"] or "Beginner"
        
        # Load official roadmap for this branch and level
        roadmap_db = get_official_roadmap_data()
        branch_levels = roadmap_db.get(branch, {})
        weeks = branch_levels.get(level, [])

        prog = (
            db.query(StudentRoadmapProgress)
            .filter(StudentRoadmapProgress.user_id == user_id, StudentRoadmapProgress.branch == branch, StudentRoadmapProgress.level == level)
            .first()
        )
        completed_weeks = prog.completed_weeks if prog else []
        in_progress_weeks = prog.in_progress_weeks if prog else []

        current_week_num = 1
        if in_progress_weeks:
            current_week_num = max(in_progress_weeks)
        elif completed_weeks:
            current_week_num = min(max(completed_weeks) + 1, 24)

        if "week" in extra and isinstance(extra["week"], int):
            current_week_num = extra["week"]

        current_week_data = next((w for w in weeks if w.get("week") == current_week_num), None)
        next_week_data = next((w for w in weeks if w.get("week") == current_week_num + 1), None)

        return {
            "selected_branch": branch,
            "selected_level": level,
            "current_week_num": current_week_num,
            "completed_weeks": completed_weeks,
            "in_progress_weeks": in_progress_weeks,
            "total_weeks": len(weeks),
            "current_week_topic": current_week_data.get("topic") if current_week_data else "General Foundations",
            "current_week_difficulty": current_week_data.get("difficulty") if current_week_data else "Beginner",
            "current_week_priority": current_week_data.get("priority") if current_week_data else "High",
            "current_week_prerequisites": current_week_data.get("prerequisites") if current_week_data else "None",
            "current_week_criteria": current_week_data.get("completion_criteria") if current_week_data else "",
            "next_week_topic": next_week_data.get("topic") if next_week_data else "Next Stage Preparation"
        }

    @classmethod
    def _build_coding_context(cls, db: Session, user_id: int, student_state: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
        # Connect with current roadmap
        roadmap_ctx = cls._build_roadmap_context(db, user_id, student_state, extra)
        
        question_id = extra.get("question_id")
        current_question = None
        if question_id:
            q = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
            if q:
                current_question = {
                    "id": q.id,
                    "title": q.title,
                    "difficulty": q.difficulty,
                    "category": q.category,
                    "problem_statement": q.problem_statement[:500] if q.problem_statement else ""
                }

        # Pull latest active coding session from short-term memory if available
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        st = mem.short_term_context if mem else {}
        latest_session = st.get("latest_coding_session") or st.get("latest_coding_error") or {}

        execution_result = extra.get("execution_result") or latest_session.get("stdout")
        error_message = extra.get("error_message") or latest_session.get("message") or latest_session.get("stderr")
        source_code = extra.get("source_code") or latest_session.get("code")
        error_type = extra.get("error_type") or latest_session.get("error_type")
        error_line = extra.get("line") or latest_session.get("line")
        language = extra.get("language") or latest_session.get("language", "python")
        stdin_input = extra.get("stdin_input") or latest_session.get("stdin", "")

        return {
            "active_roadmap_branch": roadmap_ctx["selected_branch"],
            "active_roadmap_week": roadmap_ctx["current_week_num"],
            "active_roadmap_topic": roadmap_ctx["current_week_topic"],
            "current_question": current_question,
            "source_code": source_code,
            "current_code_snippet": (source_code[:500] + "...") if source_code and len(source_code) > 500 else source_code,
            "execution_error": error_message,
            "error_type": error_type,
            "error_line": error_line,
            "language": language,
            "stdin_input": stdin_input,
            "execution_result": execution_result,
            "solved_count": student_state["coding"]["unique_solved_count"],
            "recent_submission": student_state["coding"]["latest_submission"]
        }

    @classmethod
    def _build_quiz_context(cls, db: Session, user_id: int, student_state: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
        attempt_id = extra.get("attempt_id")
        question_id = extra.get("question_id")
        selected_option = extra.get("selected_option")

        attempt_info = None
        question_info = None

        if attempt_id:
            att = db.query(QuizAttempt).filter(QuizAttempt.attempt_id == attempt_id).first()
            if att:
                details = (
                    db.query(QuizAttemptDetail)
                    .filter(QuizAttemptDetail.attempt_id == attempt_id)
                    .all()
                )
                wrong_questions = []
                for d in details:
                    if not d.is_correct and d.question:
                        wrong_questions.append({
                            "sub_topic": d.question.sub_topic,
                            "question": d.question.question_text[:200],
                            "selected": d.question.options[d.selected_option_index] if d.question.options and d.selected_option_index < len(d.question.options) else None,
                            "correct": d.question.options[d.question.correct_option_index] if d.question.options and d.question.correct_option_index < len(d.question.options) else None,
                            "explanation": d.question.explanation
                        })
                attempt_info = {
                    "attempt_id": att.attempt_id,
                    "domain": att.domain,
                    "score": att.score,
                    "total": att.total_questions,
                    "percentage": att.percentage,
                    "wrong_details": wrong_questions[:4]
                }

        if question_id:
            q = db.query(Question).filter(Question.id == question_id).first()
            if q:
                user_ans_text = q.options[selected_option] if selected_option is not None and q.options and selected_option < len(q.options) else None
                correct_ans_text = q.options[q.correct_option_index] if q.options and q.correct_option_index < len(q.options) else None
                question_info = {
                    "id": q.id,
                    "domain": q.domain,
                    "sub_topic": q.sub_topic,
                    "question_text": q.question_text,
                    "options": q.options,
                    "selected_option_index": selected_option,
                    "selected_option_text": user_ans_text,
                    "correct_option_index": q.correct_option_index,
                    "correct_option_text": correct_ans_text,
                    "explanation": q.explanation
                }

        return {
            "latest_attempt": attempt_info or student_state["quiz"]["latest_attempt"],
            "current_question_eval": question_info,
            "mastered_questions_count": student_state["quiz"]["mastered_questions"],
            "learning_questions_count": student_state["quiz"]["learning_questions"],
            "quiz_average": student_state["quiz"]["average_score"]
        }

    @classmethod
    def _build_ats_context(cls, db: Session, user_id: int, student_state: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
        latest_resume = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(desc(ResumeUpload.uploaded_at)).first()
        
        # If payload provides live mode_b JD match data
        jd_match_result = extra.get("jd_match", None)
        mode_a_result = extra.get("mode_a", None)

        ats_score = latest_resume.ats_score if latest_resume else None
        if mode_a_result and "ats_score" in mode_a_result:
            ats_score = mode_a_result["ats_score"]

        return {
            "has_resume": latest_resume is not None,
            "ats_score": ats_score,
            "section_scores": latest_resume.ats_breakdown if latest_resume else {},
            "mode_b_jd_match": jd_match_result,
            "target_role": student_state["profile"]["target_role"] or "Software / Data Specialist",
            "target_company": student_state["profile"]["target_company"],
            "total_resume_versions": student_state["resume"]["total_uploads"]
        }

    @classmethod
    def _build_interview_context(cls, db: Session, user_id: int, student_state: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
        session_id = extra.get("session_id")
        session_data = None
        if session_id:
            s = db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == user_id).first()
            if s:
                session_data = {
                    "id": s.id,
                    "type": s.interview_type,
                    "status": s.status,
                    "overall_score": s.overall_score,
                    "breakdown": s.score_breakdown or {},
                    "ai_feedback": s.ai_feedback_report or {}
                }

        return {
            "current_session": session_data or student_state["interview"]["latest_session"],
            "completed_sessions": student_state["interview"]["completed_sessions"],
            "average_score": student_state["interview"]["average_score"]
        }

    @classmethod
    def _build_dashboard_context(cls, db: Session, user_id: int, student_state: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "readiness_score": student_state["readiness"]["score"],
            "readiness_level": student_state["readiness"]["level"],
            "resume_score": student_state["resume"]["latest_score"],
            "roadmap_track": student_state["active_roadmap"]["branch"],
            "roadmap_week": student_state["active_roadmap"]["current_week"],
            "coding_solved": student_state["coding"]["unique_solved_count"],
            "quiz_attempts": student_state["quiz"]["total_attempts"],
            "interviews_done": student_state["interview"]["completed_sessions"]
        }

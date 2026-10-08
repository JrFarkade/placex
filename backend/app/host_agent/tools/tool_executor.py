"""
PlaceX Host Agent Tool Executor.
Validates tool invocations and executes controlled actions against real PlaceX services.
Blocks any arbitrary database queries, arbitrary code execution, or destructive operations.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.host_agent.state.state_manager import HostAgentStateManager
from app.host_agent.context.context_engine import get_official_roadmap_data
from app.models.learning import StudentRoadmapProgress
from app.models.quiz import QuizAttempt, QuizAttemptDetail, Question
from app.models.coding import CodingSubmission, CodingQuestion
from app.models.resume import ResumeUpload
from app.models.interview import InterviewSession


class HostAgentToolExecutor:
    """
    Backend validator and executor for all Host Agent tools.
    """

    @classmethod
    def execute_tool(cls, db: Session, user_id: int, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatches tool call to validated backend handler.
        """
        # Query Tools
        if tool_name == "get_student_profile":
            return cls._get_student_profile(db, user_id)
        elif tool_name == "get_student_skills":
            return cls._get_student_skills(db, user_id)
        elif tool_name == "get_current_roadmap":
            return cls._get_current_roadmap(db, user_id)
        elif tool_name == "get_roadmap_progress":
            return cls._get_roadmap_progress(db, user_id)
        elif tool_name == "get_current_week":
            return cls._get_current_week(db, user_id, arguments.get("branch"), arguments.get("level"))
        elif tool_name == "get_week_details":
            return cls._get_week_details(arguments.get("branch", ""), arguments.get("level", ""), arguments.get("week_num", 1))
        elif tool_name == "get_recent_quiz_results":
            return cls._get_recent_quiz_results(db, user_id, arguments.get("limit", 5))
        elif tool_name == "get_quiz_attempt":
            return cls._get_quiz_attempt(db, arguments.get("attempt_id", ""))
        elif tool_name == "get_coding_history":
            return cls._get_coding_history(db, user_id, arguments.get("limit", 5))
        elif tool_name == "get_latest_coding_result":
            return cls._get_latest_coding_result(db, user_id)
        elif tool_name == "get_latest_ats_result":
            return cls._get_latest_ats_result(db, user_id)
        elif tool_name == "get_latest_jd_match":
            return cls._get_latest_jd_match(db, user_id)
        elif tool_name == "get_interview_results":
            return cls._get_interview_results(db, user_id, arguments.get("limit", 3))
        elif tool_name == "get_knowledge_progress":
            return cls._get_knowledge_progress(db, user_id)
        elif tool_name == "get_recent_activity":
            return cls._get_recent_activity(db, user_id, arguments.get("limit", 8))

        # Action Tools
        elif tool_name == "update_learning_state":
            return cls._update_learning_state(db, user_id, arguments.get("focus_area", ""), arguments.get("priority_level", "high"))
        elif tool_name == "mark_topic_as_relevant":
            return cls._mark_topic_as_relevant(db, user_id, arguments.get("topic", ""), arguments.get("target_module", "coding"))
        elif tool_name == "create_practice_task":
            return cls._create_practice_task(
                db, user_id,
                title=arguments.get("title", "Practice Task"),
                description=arguments.get("description", ""),
                module=arguments.get("module", "coding"),
                priority=arguments.get("priority", "high"),
                target_route=arguments.get("target_route")
            )
        elif tool_name == "recommend_roadmap_week":
            return cls._recommend_roadmap_week(
                db, user_id,
                branch=arguments.get("branch", ""),
                level=arguments.get("level", ""),
                week_num=arguments.get("week_num", 1),
                reason=arguments.get("reason", "")
            )
        elif tool_name == "recommend_quiz":
            return cls._recommend_quiz(db, user_id, domain=arguments.get("domain", ""), reason=arguments.get("reason", ""))
        elif tool_name == "recommend_coding_problem":
            return cls._recommend_coding_problem(
                db, user_id,
                category=arguments.get("category", ""),
                question_id=arguments.get("question_id"),
                reason=arguments.get("reason", "")
            )
        elif tool_name == "recommend_interview_practice":
            return cls._recommend_interview_practice(db, user_id, arguments.get("interview_type", "Technical"), arguments.get("reason", ""))
        elif tool_name == "open_placex_module":
            return {"action": "navigate", "target_module": arguments.get("module_name", "dashboard")}
        elif tool_name == "show_roadmap_week":
            return {
                "action": "show_roadmap_week",
                "branch": arguments.get("branch"),
                "level": arguments.get("level"),
                "week_num": arguments.get("week_num")
            }
        elif tool_name == "explain_result":
            return {
                "action": "explanation",
                "what": arguments.get("what", ""),
                "why": arguments.get("why", ""),
                "so_what": arguments.get("so_what", ""),
                "now_what": arguments.get("now_what", "")
            }
        else:
            return {"error": f"Unknown tool: '{tool_name}'"}

    # Handler implementations
    @classmethod
    def _get_student_profile(cls, db: Session, user_id: int) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        return {
            "full_name": state["full_name"],
            "profile": state["profile"]
        }

    @classmethod
    def _get_student_skills(cls, db: Session, user_id: int) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        return {
            "skills": state["profile"]["skills"],
            "languages": state["profile"]["programming_languages"]
        }

    @classmethod
    def _get_current_roadmap(cls, db: Session, user_id: int) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        return state["active_roadmap"]

    @classmethod
    def _get_roadmap_progress(cls, db: Session, user_id: int) -> Dict[str, Any]:
        records = db.query(StudentRoadmapProgress).filter(StudentRoadmapProgress.user_id == user_id).all()
        return {
            "tracks": [
                {
                    "branch": r.branch,
                    "level": r.level,
                    "completed_weeks": r.completed_weeks or [],
                    "in_progress_weeks": r.in_progress_weeks or []
                }
                for r in records
            ]
        }

    @classmethod
    def _get_current_week(cls, db: Session, user_id: int, branch: Optional[str] = None, level: Optional[str] = None) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        b = branch or state["active_roadmap"]["branch"] or "Data Science"
        l = level or state["active_roadmap"]["level"] or "Beginner"
        
        prog = db.query(StudentRoadmapProgress).filter(
            StudentRoadmapProgress.user_id == user_id,
            StudentRoadmapProgress.branch == b,
            StudentRoadmapProgress.level == l
        ).first()

        curr_w = 1
        if prog and prog.in_progress_weeks:
            curr_w = max(prog.in_progress_weeks)
        elif prog and prog.completed_weeks:
            curr_w = min(max(prog.completed_weeks) + 1, 24)

        return cls._get_week_details(b, l, curr_w)

    @classmethod
    def _get_week_details(cls, branch: str, level: str, week_num: int) -> Dict[str, Any]:
        roadmap_data = get_official_roadmap_data()
        weeks = roadmap_data.get(branch, {}).get(level, [])
        match = next((w for w in weeks if w.get("week") == week_num), None)
        if match:
            return {
                "branch": branch,
                "level": level,
                "week_num": week_num,
                "topic": match.get("topic"),
                "difficulty": match.get("difficulty"),
                "priority": match.get("priority"),
                "prerequisites": match.get("prerequisites"),
                "completion_criteria": match.get("completion_criteria")
            }
        return {"error": f"Week {week_num} not found in {branch} ({level})"}

    @classmethod
    def _get_recent_quiz_results(cls, db: Session, user_id: int, limit: int = 5) -> Dict[str, Any]:
        attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == str(user_id)).order_by(desc(QuizAttempt.submitted_at)).limit(limit).all()
        return {
            "attempts": [
                {
                    "attempt_id": a.attempt_id,
                    "domain": a.domain,
                    "score": a.score,
                    "total": a.total_questions,
                    "percentage": a.percentage,
                    "submitted_at": a.submitted_at.isoformat()
                }
                for a in attempts
            ]
        }

    @classmethod
    def _get_quiz_attempt(cls, db: Session, attempt_id: str) -> Dict[str, Any]:
        att = db.query(QuizAttempt).filter(QuizAttempt.attempt_id == attempt_id).first()
        if not att:
            return {"error": "Quiz attempt not found"}
        details = db.query(QuizAttemptDetail).filter(QuizAttemptDetail.attempt_id == attempt_id).all()
        return {
            "attempt_id": att.attempt_id,
            "domain": att.domain,
            "score": att.score,
            "percentage": att.percentage,
            "details": [
                {
                    "question_id": d.question_id,
                    "is_correct": d.is_correct,
                    "sub_topic": d.question.sub_topic if d.question else None,
                    "question": d.question.question_text if d.question else None,
                    "selected": d.question.options[d.selected_option_index] if d.question and d.question.options and d.selected_option_index < len(d.question.options) else None,
                    "correct": d.question.options[d.question.correct_option_index] if d.question and d.question.options and d.question.correct_option_index < len(d.question.options) else None,
                    "explanation": d.question.explanation if d.question else None
                }
                for d in details
            ]
        }

    @classmethod
    def _get_coding_history(cls, db: Session, user_id: int, limit: int = 5) -> Dict[str, Any]:
        subs = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).order_by(desc(CodingSubmission.submitted_at)).limit(limit).all()
        return {
            "submissions": [
                {
                    "id": s.id,
                    "question_id": s.question_id,
                    "language": s.language,
                    "status": s.status,
                    "runtime_ms": s.runtime_ms,
                    "quality_score": s.code_quality_score,
                    "submitted_at": s.submitted_at.isoformat()
                }
                for s in subs
            ]
        }

    @classmethod
    def _get_latest_coding_result(cls, db: Session, user_id: int) -> Dict[str, Any]:
        sub = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).order_by(desc(CodingSubmission.submitted_at)).first()
        if not sub:
            return {"status": "no_submissions"}
        return {
            "id": sub.id,
            "question_id": sub.question_id,
            "status": sub.status,
            "language": sub.language,
            "passed_testcases": sub.passed_testcases,
            "total_testcases": sub.total_testcases,
            "submitted_at": sub.submitted_at.isoformat()
        }

    @classmethod
    def _get_latest_ats_result(cls, db: Session, user_id: int) -> Dict[str, Any]:
        rec = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(desc(ResumeUpload.uploaded_at)).first()
        if not rec:
            return {"status": "no_resume"}
        return {
            "ats_score": rec.ats_score,
            "section_scores": rec.ats_breakdown or {},
            "version": rec.version,
            "filename": rec.original_filename
        }

    @classmethod
    def _get_latest_jd_match(cls, db: Session, user_id: int) -> Dict[str, Any]:
        rec = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(desc(ResumeUpload.uploaded_at)).first()
        if not rec or not rec.parsed_data:
            return {"status": "no_jd_match"}
        analysis = rec.parsed_data.get("analysis_result", {})
        if analysis.get("analysis_mode") == "mode_b":
            return {
                "match_score": analysis.get("placex_match_score"),
                "keyword_score": analysis.get("keyword_score"),
                "semantic_score": analysis.get("semantic_score"),
                "matching_skills": analysis.get("matching_skills", []),
                "missing_skills": analysis.get("missing_skills", [])
            }
        return {"status": "only_mode_a_available"}

    @classmethod
    def _get_interview_results(cls, db: Session, user_id: int, limit: int = 3) -> Dict[str, Any]:
        sessions = db.query(InterviewSession).filter(InterviewSession.user_id == user_id, InterviewSession.status == "Completed").order_by(desc(InterviewSession.created_at)).limit(limit).all()
        return {
            "sessions": [
                {
                    "id": s.id,
                    "type": s.interview_type,
                    "overall_score": s.overall_score,
                    "breakdown": s.score_breakdown or {},
                    "feedback": s.ai_feedback_report or {}
                }
                for s in sessions
            ]
        }

    @classmethod
    def _get_knowledge_progress(cls, db: Session, user_id: int) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        return {
            "mastered": state["quiz"]["mastered_questions"],
            "learning": state["quiz"]["learning_questions"],
            "total_attempts": state["quiz"]["total_attempts"]
        }

    @classmethod
    def _get_recent_activity(cls, db: Session, user_id: int, limit: int = 8) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        return {"events": state["recent_activity"][:limit]}

    @classmethod
    def _update_learning_state(cls, db: Session, user_id: int, focus_area: str, priority_level: str) -> Dict[str, Any]:
        HostAgentStateManager.set_active_module(db, user_id, "learning", focus=focus_area)
        return {"status": "updated", "focus_area": focus_area, "priority": priority_level}

    @classmethod
    def _mark_topic_as_relevant(cls, db: Session, user_id: int, topic: str, target_module: str) -> Dict[str, Any]:
        return {"status": "marked", "topic": topic, "target_module": target_module}

    @classmethod
    def _create_practice_task(cls, db: Session, user_id: int, title: str, description: str, module: str, priority: str, target_route: Optional[str]) -> Dict[str, Any]:
        task = HostAgentStateManager.create_task(
            db, user_id,
            title=title,
            description=description,
            module=module,
            priority=priority,
            target_route=target_route or module
        )
        return {
            "status": "created",
            "task_id": task.id,
            "title": task.title,
            "module": task.module,
            "priority": task.priority
        }

    @classmethod
    def _recommend_roadmap_week(cls, db: Session, user_id: int, branch: str, level: str, week_num: int, reason: str) -> Dict[str, Any]:
        week_info = cls._get_week_details(branch, level, week_num)
        task_title = f"Study Week {week_num}: {week_info.get('topic', 'Roadmap Focus')}"
        cls._create_practice_task(
            db, user_id,
            title=task_title,
            description=f"{reason}\nTopic: {week_info.get('topic')}\nPrerequisites: {week_info.get('prerequisites')}",
            module="roadmap",
            priority="high",
            target_route="roadmap"
        )
        return {
            "status": "recommended",
            "branch": branch,
            "level": level,
            "week_num": week_num,
            "topic": week_info.get("topic"),
            "reason": reason
        }

    @classmethod
    def _recommend_quiz(cls, db: Session, user_id: int, domain: str, reason: str) -> Dict[str, Any]:
        cls._create_practice_task(
            db, user_id,
            title=f"Take {domain} Quiz",
            description=reason,
            module="quiz",
            priority="medium",
            target_route="knowledge"
        )
        return {"status": "recommended", "domain": domain, "reason": reason}

    @classmethod
    def _recommend_coding_problem(cls, db: Session, user_id: int, category: str, question_id: Optional[int], reason: str) -> Dict[str, Any]:
        target_q = None
        if question_id:
            target_q = db.query(CodingQuestion).filter(CodingQuestion.id == question_id).first()
        elif category:
            target_q = db.query(CodingQuestion).filter(CodingQuestion.category.ilike(f"%{category}%")).first()

        title = f"Practice Coding: {target_q.title if target_q else category}"
        cls._create_practice_task(
            db, user_id,
            title=title,
            description=reason,
            module="coding",
            priority="high",
            target_route="coding"
        )
        return {
            "status": "recommended",
            "question_id": target_q.id if target_q else None,
            "title": target_q.title if target_q else category,
            "reason": reason
        }

    @classmethod
    def _recommend_interview_practice(cls, db: Session, user_id: int, interview_type: str, reason: str) -> Dict[str, Any]:
        cls._create_practice_task(
            db, user_id,
            title=f"Mock Interview: {interview_type} Practice",
            description=reason,
            module="interview",
            priority="medium",
            target_route="interview"
        )
        return {"status": "recommended", "interview_type": interview_type, "reason": reason}

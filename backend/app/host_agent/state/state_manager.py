"""
PlaceX Host Agent State Manager.
Maintains persistent student state built strictly from real PlaceX database records.
Never invents student details, fake scores, or artificial skills.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.profile import StudentProfile
from app.models.resume import ResumeUpload
from app.models.quiz import QuizAttempt, QuizAttemptDetail, UserProgress, Question
from app.models.coding import CodingSubmission, CodingQuestion
from app.models.interview import InterviewSession
from app.models.learning import PlacementReadiness, StudentRoadmapProgress
from app.models.memory import StudentMemory, HostAgentEvent, HostAgentTask


class HostAgentStateManager:
    """
    Central student state reader and updater for the Host Agent.
    Aggregates objective data from all PlaceX services.
    """

    @classmethod
    def get_student_state(cls, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Builds complete 360-degree student context snapshot from real database records.
        """
        user = db.query(User).filter(User.id == user_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        
        # 1. Profile & Identity
        full_name = user.full_name if user else "Student"
        email = user.email if user else ""
        target_role = profile.target_role if profile and profile.target_role else None
        target_company = profile.target_company if profile and profile.target_company else None
        degree = profile.degree if profile else None
        branch = profile.branch if profile else None
        university = profile.university if profile else None
        cgpa = profile.cgpa if profile else None
        graduation_year = profile.graduation_year if profile else None
        skills = profile.skills if profile and profile.skills else []
        languages = profile.programming_languages if profile and profile.programming_languages else []

        # 2. Career Roadmap Progress
        roadmap_records = db.query(StudentRoadmapProgress).filter(StudentRoadmapProgress.user_id == user_id).all()
        roadmaps = []
        active_branch = None
        active_level = None
        active_week = 1
        
        for r in roadmap_records:
            completed_weeks = r.completed_weeks or []
            in_prog_weeks = r.in_progress_weeks or []
            # Calculate current week: highest in-progress or completed + 1
            curr_w = 1
            if in_prog_weeks:
                curr_w = max(in_prog_weeks)
            elif completed_weeks:
                curr_w = min(max(completed_weeks) + 1, 24)
                
            roadmaps.append({
                "branch": r.branch,
                "level": r.level,
                "completed_weeks": completed_weeks,
                "in_progress_weeks": in_prog_weeks,
                "current_week": curr_w,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None
            })
            if not active_branch:
                active_branch = r.branch
                active_level = r.level
                active_week = curr_w

        # 3. ATS Resume Checker History
        resumes = db.query(ResumeUpload).filter(ResumeUpload.user_id == user_id).order_by(desc(ResumeUpload.uploaded_at)).all()
        latest_resume = resumes[0] if resumes else None
        
        resume_state = {
            "has_resume": latest_resume is not None,
            "total_uploads": len(resumes),
            "latest_score": latest_resume.ats_score if latest_resume else None,
            "latest_breakdown": latest_resume.ats_breakdown if latest_resume else {},
            "latest_filename": latest_resume.original_filename if latest_resume else None,
            "latest_version": latest_resume.version if latest_resume else None,
            "uploaded_at": latest_resume.uploaded_at.isoformat() if latest_resume else None
        }

        # 4. Coding Sandbox History
        submissions = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id).order_by(desc(CodingSubmission.submitted_at)).all()
        accepted_subs = [s for s in submissions if s.status.lower() == "accepted"]
        failed_subs = [s for s in submissions if s.status.lower() != "accepted"]
        solved_q_ids = list(set(s.question_id for s in accepted_subs))
        latest_sub = submissions[0] if submissions else None

        coding_state = {
            "total_submissions": len(submissions),
            "accepted_submissions": len(accepted_subs),
            "unique_solved_count": len(solved_q_ids),
            "solved_question_ids": solved_q_ids,
            "latest_submission": {
                "question_id": latest_sub.question_id,
                "status": latest_sub.status,
                "language": latest_sub.language,
                "runtime_ms": latest_sub.runtime_ms,
                "quality_score": latest_sub.code_quality_score,
                "submitted_at": latest_sub.submitted_at.isoformat()
            } if latest_sub else None
        }

        # 5. Quiz / Knowledge Base History
        attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == str(user_id)).order_by(desc(QuizAttempt.submitted_at)).all()
        user_progress = db.query(UserProgress).filter(UserProgress.user_id == str(user_id)).all()
        mastered_count = sum(1 for p in user_progress if p.status == "mastered")
        learning_count = sum(1 for p in user_progress if p.status == "learning")
        
        quiz_avg = round(sum(a.percentage for a in attempts) / len(attempts), 1) if attempts else None
        latest_attempt = attempts[0] if attempts else None

        quiz_state = {
            "total_attempts": len(attempts),
            "average_score": quiz_avg,
            "mastered_questions": mastered_count,
            "learning_questions": learning_count,
            "latest_attempt": {
                "attempt_id": latest_attempt.attempt_id,
                "domain": latest_attempt.domain,
                "score": latest_attempt.score,
                "total_questions": latest_attempt.total_questions,
                "percentage": latest_attempt.percentage,
                "submitted_at": latest_attempt.submitted_at.isoformat()
            } if latest_attempt else None
        }

        # 6. Mock Interview History
        interviews = db.query(InterviewSession).filter(InterviewSession.user_id == user_id).order_by(desc(InterviewSession.created_at)).all()
        completed_interviews = [i for i in interviews if i.status == "Completed"]
        avg_interview_score = round(sum(i.overall_score for i in completed_interviews) / len(completed_interviews), 1) if completed_interviews else None
        latest_interview = completed_interviews[0] if completed_interviews else None

        interview_state = {
            "total_sessions": len(interviews),
            "completed_sessions": len(completed_interviews),
            "average_score": avg_interview_score,
            "latest_session": {
                "id": latest_interview.id,
                "interview_type": latest_interview.interview_type,
                "overall_score": latest_interview.overall_score,
                "score_breakdown": latest_interview.score_breakdown or {},
                "created_at": latest_interview.created_at.isoformat()
            } if latest_interview else None
        }

        # 7. Placement Readiness
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.user_id == user_id).first()
        readiness_state = {
            "score": readiness.readiness_score if readiness else None,
            "level": readiness.readiness_level if readiness else "Not Calculated",
            "breakdown": readiness.score_breakdown if readiness else {}
        }

        # 8. Detect Objective Strengths and Weak Areas from actual data
        strengths: List[str] = []
        weak_areas: List[str] = []

        # From Quiz attempts:
        for a in attempts[:5]:
            if a.percentage >= 75:
                strengths.append(f"Quiz Domain Mastery: {a.domain} ({a.percentage}%)")
            elif a.percentage < 60:
                weak_areas.append(f"Quiz Domain Need Review: {a.domain} ({a.percentage}%)")

        # From Quiz details (specific questions answered wrong):
        recent_wrong_details = (
            db.query(QuizAttemptDetail)
            .join(QuizAttempt, QuizAttemptDetail.attempt_id == QuizAttempt.attempt_id)
            .filter(QuizAttempt.user_id == str(user_id), QuizAttemptDetail.is_correct == False)
            .order_by(desc(QuizAttempt.submitted_at))
            .limit(5)
            .all()
        )
        for wd in recent_wrong_details:
            if wd.question and wd.question.sub_topic:
                if wd.question.sub_topic not in [w.replace("Needs Practice: ", "") for w in weak_areas]:
                    weak_areas.append(f"Needs Practice: {wd.question.sub_topic}")

        # From Coding:
        if accepted_subs:
            strengths.append(f"Solved {len(solved_q_ids)} technical problems successfully")
        if failed_subs and len(failed_subs) > len(accepted_subs):
            recent_failed = failed_subs[0]
            weak_areas.append(f"Coding Debugging ({recent_failed.status})")

        # From ATS:
        if latest_resume and latest_resume.ats_score:
            if latest_resume.ats_score >= 75:
                strengths.append(f"ATS Resume Structure ({latest_resume.ats_score}/100)")
            else:
                weak_areas.append(f"ATS Resume Formatting/Keywords ({latest_resume.ats_score}/100)")

        # From Skills:
        if skills:
            strengths.extend([f"Confirmed Skill: {s}" for s in skills[:3]])

        # 9. Active Tasks
        active_tasks = (
            db.query(HostAgentTask)
            .filter(HostAgentTask.user_id == user_id, HostAgentTask.status.in_(["pending", "in_progress"]))
            .order_by(desc(HostAgentTask.created_at))
            .limit(5)
            .all()
        )
        tasks_list = [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "module": t.module,
                "priority": t.priority,
                "status": t.status,
                "target_route": t.target_route,
                "created_at": t.created_at.isoformat()
            }
            for t in active_tasks
        ]

        # 10. Recent Events (Activity Stream)
        recent_events = (
            db.query(HostAgentEvent)
            .filter(HostAgentEvent.user_id == user_id)
            .order_by(desc(HostAgentEvent.created_at))
            .limit(8)
            .all()
        )
        events_list = [
            {
                "event_type": e.event_type,
                "module": e.module,
                "data": e.payload,
                "created_at": e.created_at.isoformat()
            }
            for e in recent_events
        ]

        # 11. Dual Memory sync
        mem_record = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        short_term = mem_record.short_term_context if mem_record else {}

        return {
            "user_id": user_id,
            "full_name": full_name,
            "email": email,
            "profile": {
                "target_role": target_role,
                "target_company": target_company,
                "degree": degree,
                "branch": branch,
                "university": university,
                "cgpa": cgpa,
                "graduation_year": graduation_year,
                "skills": skills,
                "programming_languages": languages
            },
            "active_roadmap": {
                "branch": active_branch,
                "level": active_level,
                "current_week": active_week,
                "all_tracks": roadmaps
            },
            "resume": resume_state,
            "coding": coding_state,
            "quiz": quiz_state,
            "interview": interview_state,
            "readiness": readiness_state,
            "strengths": list(dict.fromkeys(strengths))[:6],
            "weak_areas": list(dict.fromkeys(weak_areas))[:6],
            "tasks": tasks_list,
            "recent_activity": events_list,
            "active_module": short_term.get("active_module", "dashboard"),
            "current_focus": short_term.get("current_focus", None)
        }

    @classmethod
    def record_event(cls, db: Session, user_id: int, event_type: str, module: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> HostAgentEvent:
        """
        Lightweight event recording inside PlaceX. Updates short-term focus and event ledger.
        """
        payload = data or {}
        event = HostAgentEvent(
            user_id=user_id,
            event_type=event_type,
            module=module,
            payload=payload,
            created_at=datetime.utcnow()
        )
        db.add(event)

        # Update short term context in StudentMemory
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if not mem:
            mem = StudentMemory(user_id=user_id, short_term_context={}, long_term_memory={})
            db.add(mem)
            db.flush()

        st = dict(mem.short_term_context or {})
        if module:
            st["active_module"] = module
        st["last_event_type"] = event_type
        st["last_event_time"] = datetime.utcnow().isoformat()
        
        if "focus" in payload:
            st["current_focus"] = payload["focus"]
        elif "topic" in payload:
            st["current_focus"] = payload["topic"]

        # Track active session artifacts for conversational continuity
        if event_type.startswith("coding."):
            st["latest_coding_session"] = payload
            if event_type == "coding.execution_failed":
                st["latest_coding_error"] = payload
        elif event_type == "quiz.completed":
            st["latest_quiz_result"] = payload
        elif event_type.startswith("roadmap."):
            st["latest_roadmap_view"] = payload

        mem.short_term_context = st
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def get_conversation_history(cls, db: Session, user_id: int) -> List[Dict[str, str]]:
        """
        Retrieves recent multi-turn conversation history for this student.
        """
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if not mem or not mem.short_term_context:
            return []
        return mem.short_term_context.get("conversation_history", [])

    @classmethod
    def append_conversation_history(cls, db: Session, user_id: int, user_message: str, agent_reply: str):
        """
        Appends a dialogue turn to student memory, keeping a sensible recent window (max 8 turns).
        """
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if not mem:
            mem = StudentMemory(user_id=user_id, short_term_context={}, long_term_memory={})
            db.add(mem)
            db.flush()

        st = dict(mem.short_term_context or {})
        history = list(st.get("conversation_history", []))
        history.append({"role": "user", "text": user_message})
        history.append({"role": "model", "text": agent_reply})
        # Keep recent 8 entries (4 roundtrips)
        st["conversation_history"] = history[-8:]
        mem.short_term_context = st
        db.commit()

    @classmethod
    def create_task(cls, db: Session, user_id: int, title: str, description: str, module: str, priority: str = "high", target_route: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> HostAgentTask:
        """
        Creates an actionable learning task for the student.
        """
        task = HostAgentTask(
            user_id=user_id,
            title=title,
            description=description,
            module=module,
            priority=priority,
            status="pending",
            source="host_agent",
            target_route=target_route or module,
            task_metadata=metadata or {},
            created_at=datetime.utcnow()
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @classmethod
    def update_task_status(cls, db: Session, task_id: int, user_id: int, status: str) -> Optional[HostAgentTask]:
        """
        Updates task status (pending, in_progress, completed, dismissed).
        """
        task = db.query(HostAgentTask).filter(HostAgentTask.id == task_id, HostAgentTask.user_id == user_id).first()
        if task:
            task.status = status
            if status == "completed":
                task.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(task)
        return task

    @classmethod
    def set_active_module(cls, db: Session, user_id: int, module_name: str, focus: Optional[str] = None):
        """
        Updates the active module context in short term memory.
        """
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if not mem:
            mem = StudentMemory(user_id=user_id, short_term_context={}, long_term_memory={})
            db.add(mem)
            db.flush()

        st = dict(mem.short_term_context or {})
        st["active_module"] = module_name
        if focus:
            st["current_focus"] = focus
        mem.short_term_context = st
        db.commit()

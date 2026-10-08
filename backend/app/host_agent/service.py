"""
PlaceX Host Agent Service Facade.
High-level service interface for the Host Agent layer.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.host_agent.events.event_types import PlaceXEventType
from app.host_agent.state.state_manager import HostAgentStateManager
from app.host_agent.context.context_engine import HostAgentContextEngine
from app.host_agent.reasoning.orchestrator import HostAgentOrchestrator
from app.host_agent.reasoning.next_action_engine import NextActionEngine
from app.host_agent.tools.tool_executor import HostAgentToolExecutor
from app.host_agent.tools.tool_registry import HOST_AGENT_TOOLS


class HostAgentService:
    """
    Main Service Facade exposing Host Agent intelligence to PlaceX routers and modules.
    """

    @classmethod
    def record_event(cls, db: Session, user_id: int, event_type: str, module: Optional[str] = None, data: Optional[Dict[str, Any]] = None):
        return HostAgentStateManager.record_event(db, user_id, event_type, module, data)

    @classmethod
    def handle_chat(cls, db: Session, user_id: int, message: str, active_module: str = "dashboard", extra_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return HostAgentOrchestrator.handle_conversation(db, user_id, message, active_module, extra_data)

    @classmethod
    def get_student_state(cls, db: Session, user_id: int) -> Dict[str, Any]:
        return HostAgentStateManager.get_student_state(db, user_id)

    @classmethod
    def get_student_context(cls, db: Session, user_id: int, active_module: str = "dashboard", extra_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return HostAgentContextEngine.get_context_package(db, user_id, active_module, extra_data)

    @classmethod
    def get_next_action(cls, db: Session, user_id: int) -> Dict[str, Any]:
        return NextActionEngine.evaluate_next_action(db, user_id)

    @classmethod
    def explain_coding_error(
        cls,
        db: Session,
        user_id: int,
        source_code: str,
        error_message: str = "",
        stdin_input: str = "",
        language: str = "python",
        user_question: Optional[str] = None,
        stdout: Optional[str] = "",
        error_line: Optional[int] = None,
        error_type: Optional[str] = None
    ) -> Dict[str, Any]:
        return HostAgentOrchestrator.explain_coding_error(
            db=db,
            user_id=user_id,
            source_code=source_code,
            error_message=error_message,
            stdin_input=stdin_input,
            language=language,
            user_question=user_question,
            stdout=stdout,
            error_line=error_line,
            error_type=error_type
        )

    @classmethod
    def review_ats(cls, db: Session, user_id: int, ats_score: float, section_scores: Dict[str, Any], suggestions: List[str]) -> Dict[str, Any]:
        return HostAgentOrchestrator.review_ats_result(db, user_id, ats_score, section_scores, suggestions)

    @classmethod
    def review_jd_match(cls, db: Session, user_id: int, match_score: float, exact_keyword_score: float, semantic_score: float, matching_skills: List[str], missing_skills: List[str], job_description: str) -> Dict[str, Any]:
        return HostAgentOrchestrator.review_jd_match_result(db, user_id, match_score, exact_keyword_score, semantic_score, matching_skills, missing_skills, job_description)

    @classmethod
    def chat_about_resume(
        cls,
        db: Session,
        user_id: int,
        message: str,
        analysis_mode: str,
        ats_score: float,
        section_scores: Optional[Dict[str, Any]] = None,
        suggestions: Optional[List[str]] = None,
        matching_skills: Optional[List[str]] = None,
        missing_skills: Optional[List[str]] = None,
        job_description: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        return HostAgentOrchestrator.chat_about_resume(
            db=db,
            user_id=user_id,
            message=message,
            analysis_mode=analysis_mode,
            ats_score=ats_score,
            section_scores=section_scores,
            suggestions=suggestions,
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            job_description=job_description,
            conversation_history=conversation_history
        )

    @classmethod
    def explain_quiz_question(cls, db: Session, user_id: int, question_id: int, selected_option_index: int) -> Dict[str, Any]:
        return HostAgentOrchestrator.explain_quiz_question(db, user_id, question_id, selected_option_index)

    @classmethod
    def explain_roadmap_week(
        cls,
        db: Session,
        user_id: int,
        branch: str,
        level: str,
        week_number: int,
        week_title: str,
        prerequisites: Optional[str] = None,
        completion_criteria: Optional[str] = None,
        user_question: Optional[str] = None
    ) -> Dict[str, Any]:
        return HostAgentOrchestrator.explain_roadmap_week(
            db=db,
            user_id=user_id,
            branch=branch,
            level=level,
            week_number=week_number,
            week_title=week_title,
            prerequisites=prerequisites,
            completion_criteria=completion_criteria,
            user_question=user_question
        )

    @classmethod
    def execute_tool(cls, db: Session, user_id: int, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        return HostAgentToolExecutor.execute_tool(db, user_id, tool_name, arguments)

    @classmethod
    def list_tools(cls) -> List[Dict[str, Any]]:
        return HOST_AGENT_TOOLS

    @classmethod
    def create_task(cls, db: Session, user_id: int, title: str, description: str, module: str, priority: str = "high", target_route: Optional[str] = None):
        return HostAgentStateManager.create_task(db, user_id, title, description, module, priority, target_route)

    @classmethod
    def update_task_status(cls, db: Session, task_id: int, user_id: int, status: str):
        return HostAgentStateManager.update_task_status(db, task_id, user_id, status)

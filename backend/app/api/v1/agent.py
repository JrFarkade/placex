"""
PlaceX Host Agent API Endpoints.
Central intelligence router handling events, context slicing, reasoning, tasks, and reviews.
"""

import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

logger = logging.getLogger("placex.coding_sandbox")

from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.host_agent.service import HostAgentService
from app.schemas.agent import (
    ChatRequest,
    ChatResponse,
    EventRequest,
    TaskCreateRequest,
    TaskUpdateRequest,
    ToolExecutionRequest,
    ATSReviewRequest,
    JDMatchReviewRequest,
    HostAgentReviewResponse,
    QuizExplainRequest,
    CodingErrorExplainRequest,
    RoadmapWeekExplainRequest,
    ResumeChatRequest
)

router = APIRouter(prefix="/agent", tags=["PlaceX Host Agent Intelligence"])


import uuid
from datetime import datetime
from sqlalchemy import desc
from app.models.memory import AgentConversation, AgentMessage


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Lists recent Host Agent conversations for the authenticated student.
    """
    convs = (
        db.query(AgentConversation)
        .filter(AgentConversation.user_id == current_user.id)
        .order_by(desc(AgentConversation.updated_at))
        .limit(25)
        .all()
    )
    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "message_count": len(c.messages),
                "preview": c.messages[-1].text[:80] if c.messages else ""
            }
            for c in convs
        ]
    }


@router.post("/conversations")
def create_new_conversation(
    payload: Optional[Dict[str, Any]] = Body(default={}),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Creates a new conversation session (+ New Chat).
    """
    title = (payload or {}).get("title", "New Chat")
    conv = AgentConversation(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=title,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
        "messages": []
    }


@router.get("/conversations/{conversation_id}")
def get_conversation_history(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves full message history for a specific conversation session with strict student isolation.
    """
    conv = (
        db.query(AgentConversation)
        .filter(AgentConversation.id == conversation_id, AgentConversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
        "messages": [
            {
                "id": str(m.id),
                "sender": m.sender,
                "text": m.text,
                "timestamp": m.created_at.strftime("%I:%M %p")
            }
            for m in conv.messages
        ]
    }


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Deletes a conversation session.
    """
    conv = (
        db.query(AgentConversation)
        .filter(AgentConversation.id == conversation_id, AgentConversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"status": "deleted", "id": conversation_id}


@router.post("/chat", response_model=ChatResponse)
def chat_with_host_agent(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Direct dialogue with Host Agent. Maintains full PlaceX context awareness and session persistence.
    """
    module = req.active_module or req.active_feature or "dashboard"
    conv_id = req.conversation_id

    # 1. Resolve or create active conversation session
    conv = None
    if conv_id:
        conv = (
            db.query(AgentConversation)
            .filter(AgentConversation.id == conv_id, AgentConversation.user_id == current_user.id)
            .first()
        )
    
    if not conv:
        # Use most recent active conversation or create new
        conv = (
            db.query(AgentConversation)
            .filter(AgentConversation.user_id == current_user.id)
            .order_by(desc(AgentConversation.updated_at))
            .first()
        )
        if not conv:
            conv = AgentConversation(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                title="New Chat",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)

    # 2. Persist student message
    user_msg = AgentMessage(
        conversation_id=conv.id,
        sender="user",
        text=req.message,
        created_at=datetime.utcnow()
    )
    db.add(user_msg)

    # Update conversation title from first user query if still generic
    if conv.title in ("New Chat", "Conversation"):
        words = req.message.strip().split()
        conv.title = " ".join(words[:5]) if words else "Conversation"

    conv.updated_at = datetime.utcnow()
    db.commit()

    # 3. Call Host Agent Core Reasoning
    result = HostAgentService.handle_chat(
        db=db,
        user_id=current_user.id,
        message=req.message,
        active_module=module,
        extra_data=req.extra_data
    )

    # 4. Persist Host Agent reply
    agent_msg = AgentMessage(
        conversation_id=conv.id,
        sender="agent",
        text=result.get("reply", ""),
        created_at=datetime.utcnow()
    )
    db.add(agent_msg)
    db.commit()

    result["conversation_id"] = conv.id
    return result


@router.post("/events")
def record_application_event(
    req: EventRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Receives meaningful application events within PlaceX and updates Host Agent state.
    """
    event = HostAgentService.record_event(
        db=db,
        user_id=current_user.id,
        event_type=req.event_type,
        module=req.module,
        data=req.data
    )
    return {
        "status": "recorded",
        "event_id": event.id,
        "event_type": event.event_type,
        "created_at": event.created_at.isoformat()
    }


@router.get("/state")
def get_student_state(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves complete 360-degree student context snapshot from real PlaceX data.
    """
    return HostAgentService.get_student_state(db, current_user.id)


@router.get("/context")
def get_student_context(
    module: str = Query("dashboard", description="Active module name"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves targeted contextual slice for the active module.
    """
    return HostAgentService.get_student_context(db, current_user.id, active_module=module)


@router.get("/next-action")
def get_next_best_action(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Dynamic Next Best Action engine output with priority, rationale, and 1-click CTA.
    """
    return HostAgentService.get_next_action(db, current_user.id)


@router.get("/tasks")
def list_student_tasks(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Lists active proactive learning tasks generated by Host Agent.
    """
    state = HostAgentService.get_student_state(db, current_user.id)
    return {"tasks": state["tasks"]}


@router.post("/tasks")
def create_student_task(
    req: TaskCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Creates an actionable practice task.
    """
    task = HostAgentService.create_task(
        db=db,
        user_id=current_user.id,
        title=req.title,
        description=req.description,
        module=req.module,
        priority=req.priority,
        target_route=req.target_route
    )
    return {
        "status": "created",
        "id": task.id,
        "task_id": task.id,
        "title": task.title,
        "status_code": task.status
    }


@router.patch("/tasks/{task_id}")
def update_task_status(
    task_id: int,
    req: TaskUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Updates the status of a Host Agent task (pending, in_progress, completed, dismissed).
    """
    task = HostAgentService.update_task_status(db, task_id, current_user.id, req.status)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "updated", "id": task.id, "task_id": task.id, "new_status": task.status, "status_value": task.status}


@router.get("/tools")
def list_host_tools(
    current_user = Depends(get_current_user)
):
    """
    Lists controlled tools available to the Host Agent with JSON schemas.
    """
    return {"tools": HostAgentService.list_tools()}


@router.post("/tools/execute")
def execute_tool(
    req: ToolExecutionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Executes a validated controlled tool securely on the backend.
    """
    result = HostAgentService.execute_tool(db, current_user.id, req.tool_name, req.arguments)
    return {"status": "success", "tool": req.tool_name, "result": result}


@router.post("/explain/coding-error")
def explain_coding_error(
    req: CodingErrorExplainRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Explains a Python execution error or logical issue from Coding Sandbox
    using the Main Host Agent and generates a validated correction.
    """
    logger.info("[CODING_SANDBOX] Explain & Fix requested")
    logger.info(f"[CODING_SANDBOX] language = {req.language or 'python'}")
    logger.info(f"[CODING_SANDBOX] code_length = {len(req.source_code)}")
    logger.info(f"[CODING_SANDBOX] error_type = {req.error_type or 'Unknown'}")

    return HostAgentService.explain_coding_error(
        db=db,
        user_id=current_user.id,
        source_code=req.source_code,
        error_message=req.error_message or "",
        stdin_input=req.stdin_input or "",
        language=req.language or "python",
        user_question=req.user_question,
        stdout=req.stdout or "",
        error_line=req.error_line,
        error_type=req.error_type
    )


@router.post("/explain/quiz-question")
@router.post("/explain/quiz")
def explain_quiz_question(
    req: QuizExplainRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Explains why a quiz answer was incorrect using actual question and explanation.
    """
    return HostAgentService.explain_quiz_question(
        db=db,
        user_id=current_user.id,
        question_id=req.question_id,
        selected_option_index=req.selected_option_index
    )


@router.post("/explain/ats-result", response_model=HostAgentReviewResponse)
@router.post("/review/ats", response_model=HostAgentReviewResponse)
def review_ats_result(
    req: ATSReviewRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Analyzes ATS score without altering ATS scoring engine.
    """
    return HostAgentService.review_ats(
        db=db,
        user_id=current_user.id,
        ats_score=req.ats_score,
        section_scores=req.section_scores or {},
        suggestions=req.suggestions or []
    )


@router.post("/explain/jd-match", response_model=HostAgentReviewResponse)
@router.post("/review/jd-match", response_model=HostAgentReviewResponse)
def review_jd_match_result(
    req: JDMatchReviewRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Analyzes Job Description match without altering matcher engine.
    """
    return HostAgentService.review_jd_match(
        db=db,
        user_id=current_user.id,
        match_score=req.match_score,
        exact_keyword_score=req.exact_keyword_match_score or 0.0,
        semantic_score=req.semantic_similarity_score or 0.0,
        matching_skills=req.matching_skills or [],
        missing_skills=req.missing_skills or [],
        job_description=req.job_description or ""
    )


@router.post("/explain/resume/chat")
def chat_about_resume(
    req: ResumeChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Main Host Agent conversational chat grounded on the student's actual resume / JD match data.
    """
    return HostAgentService.chat_about_resume(
        db=db,
        user_id=current_user.id,
        message=req.message,
        analysis_mode=req.analysis_mode or "MODE_A_RESUME_HEALTH_CHECK",
        ats_score=req.ats_score or 0.0,
        section_scores=req.section_scores,
        suggestions=req.suggestions,
        matching_skills=req.matching_skills,
        missing_skills=req.missing_skills,
        job_description=req.job_description,
        conversation_history=req.conversation_history
    )


@router.get("/memory")
def get_host_agent_memory(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Compatibility endpoint for dashboard memory retrieval.
    """
    state = HostAgentService.get_student_state(db, current_user.id)
    return {
        "short_term": {"active_module": state["active_module"], "current_focus": state["current_focus"]},
        "long_term": {
            "target_role": state["profile"]["target_role"],
            "target_company": state["profile"]["target_company"],
            "skills": state["profile"]["skills"],
            "readiness_score": state["readiness"]["score"],
            "readiness_level": state["readiness"]["level"],
            "resume_score": state["resume"]["latest_score"],
            "coding_solved": state["coding"]["unique_solved_count"],
            "completed_interviews": state["interview"]["completed_sessions"]
        }
    }


@router.post("/explain/roadmap-week")
def explain_roadmap_week(
    req: RoadmapWeekExplainRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Dynamically explains a Career Roadmap week using the Main Host Agent and Gemini intelligence.
    Context-aware across all 4 branches, 3 levels, and 24 weeks.
    Supports student follow-up questions within the selected week's context.
    """
    return HostAgentService.explain_roadmap_week(
        db=db,
        user_id=current_user.id,
        branch=req.branch,
        level=req.level,
        week_number=req.week_number,
        week_title=req.week_title,
        prerequisites=req.prerequisites,
        completion_criteria=req.completion_criteria,
        user_question=req.user_question
    )

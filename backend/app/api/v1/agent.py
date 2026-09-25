from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.agent import (
    ChatRequest, 
    ChatResponse, 
    ATSReviewRequest, 
    JDMatchReviewRequest, 
    HostAgentReviewResponse
)
from app.host_agent.services.orchestrator import HostAgentOrchestrator
from app.host_agent.services.review_engine import HostAgentReviewEngine
from app.host_agent.services.context_builder import StudentContextBuilder
from app.host_agent.memory.memory_manager import MemoryManager
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/agent", tags=["Host Agent"])

@router.post("/chat", response_model=ChatResponse)
def chat_with_host_agent(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return HostAgentOrchestrator.process_request(
        db=db,
        user_id=current_user.id,
        message=req.message,
        active_feature=req.active_feature or "dashboard"
    )

@router.get("/memory")
def get_host_agent_memory(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return MemoryManager.get_memory(db, user_id=current_user.id)

@router.get("/context")
def get_student_context(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return StudentContextBuilder.build_student_context(db, current_user.id)

@router.post("/review/ats", response_model=HostAgentReviewResponse)
def review_ats_result(
    req: ATSReviewRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return HostAgentReviewEngine.review_ats_health_check(
        db=db,
        user_id=current_user.id,
        ats_score=req.ats_score,
        doc_type=req.doc_type or "TEXT_RESUME",
        section_scores=req.section_scores or {},
        suggestions=req.suggestions or []
    )

@router.post("/review/jd-match", response_model=HostAgentReviewResponse)
def review_jd_match_result(
    req: JDMatchReviewRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return HostAgentReviewEngine.review_jd_match(
        db=db,
        user_id=current_user.id,
        match_score=req.match_score,
        exact_keyword_score=req.exact_keyword_match_score or 0.0,
        semantic_score=req.semantic_similarity_score or 0.0,
        matching_skills=req.matching_skills or [],
        missing_skills=req.missing_skills or [],
        target_jd=req.job_description or ""
    )

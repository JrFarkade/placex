from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.interview_service.services.interview_service import InterviewService

router = APIRouter(prefix="/interview", tags=["Interview Intelligence"])

@router.post("/start")
def start_interview(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    interview_type = payload.get("interview_type", "Technical")
    target_company = payload.get("target_company", "")
    role = payload.get("role", "")
    difficulty = payload.get("difficulty", "")
    domain_interests = payload.get("domain_interests", [])

    return InterviewService.start_session(
        db=db,
        user_id=current_user.id,
        interview_type=interview_type,
        target_company=target_company,
        role=role,
        difficulty=difficulty,
        domain_interests=domain_interests
    )

@router.post("/answer")
def submit_answer(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session_id = payload.get("session_id", 1)
    question = payload.get("question", "")
    answer_text = payload.get("answer_text", "")
    duration_sec = float(payload.get("duration_sec", 0.0))

    return InterviewService.evaluate_response(
        db=db,
        session_id=session_id,
        question=question,
        answer_text=answer_text,
        duration_sec=duration_sec
    )

@router.post("/finish")
def finish_interview(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session_id = payload.get("session_id", 1)
    return InterviewService.finish_session(db=db, session_id=session_id)

@router.post("/teardown")
def teardown_interview(
    payload: dict = Body(default={}),
    current_user = Depends(get_current_user)
):
    InterviewService._kill_port_7860()
    return {"status": "ok"}


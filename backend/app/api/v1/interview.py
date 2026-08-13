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
    target_company = payload.get("target_company", "Google")
    return InterviewService.start_session(
        db=db,
        user_id=current_user.id,
        interview_type=interview_type,
        target_company=target_company
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
    return InterviewService.evaluate_response(
        db=db,
        session_id=session_id,
        question=question,
        answer_text=answer_text
    )

@router.post("/finish")
def finish_interview(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session_id = payload.get("session_id", 1)
    return InterviewService.finish_session(db=db, session_id=session_id)

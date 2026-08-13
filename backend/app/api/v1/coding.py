from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.coding_service.services.coding_service import CodingService

router = APIRouter(prefix="/coding", tags=["Coding Intelligence"])

@router.get("/questions")
def list_questions(
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return CodingService.get_questions(db, difficulty=difficulty, category=category)

@router.get("/question/{question_id}")
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = CodingService.get_question_by_id(db, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    return q

@router.get("/recommendation")
def get_recommendation(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return CodingService.get_personalized_recommendation(db, user_id=current_user.id)

@router.post("/run")
def run_code(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    question_id = payload.get("question_id", 1)
    source_code = payload.get("source_code", "")
    language = payload.get("language", "python")
    custom_input = payload.get("custom_input", "")

    return CodingService.run_code(
        db=db,
        user_id=current_user.id,
        question_id=question_id,
        source_code=source_code,
        language=language,
        custom_input=custom_input
    )

@router.post("/submit")
def submit_code(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    question_id = payload.get("question_id", 1)
    source_code = payload.get("source_code", "")
    language = payload.get("language", "python")

    return CodingService.submit_solution(
        db=db,
        user_id=current_user.id,
        question_id=question_id,
        source_code=source_code,
        language=language
    )

@router.get("/submissions")
def get_submissions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return CodingService.get_submission_history(db, user_id=current_user.id)

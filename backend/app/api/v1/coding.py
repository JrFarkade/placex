from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.coding_service.services.coding_service import CodingService

router = APIRouter(prefix="/coding", tags=["Coding Intelligence"])

@router.get("/questions")
def list_questions(
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return CodingService.get_questions(
        db,
        user_id=current_user.id,
        difficulty=difficulty,
        category=category,
        search=search,
        status=status
    )

@router.get("/question/{question_id}")
def get_question(
    question_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    q = CodingService.get_question_by_id(db, user_id=current_user.id, question_id=question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    return q

@router.get("/recommendation")
def get_recommendation(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return CodingService.get_personalized_recommendation(db, user_id=current_user.id)

@router.get("/draft")
def get_draft(
    question_id: int = Query(...),
    language: str = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    draft_code = CodingService.get_draft(db, user_id=current_user.id, question_id=question_id, language=language)
    return {"draft": draft_code}

@router.post("/draft")
def save_draft(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    question_id = payload.get("question_id")
    language = payload.get("language")
    source_code = payload.get("source_code")
    if question_id and language and source_code is not None:
        CodingService.save_draft(db, user_id=current_user.id, question_id=question_id, language=language, source_code=source_code)
    return {"status": "saved"}

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

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return CodingService.get_stats(db, user_id=current_user.id)

@router.post("/bookmark")
def toggle_bookmark(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    question_id = payload.get("question_id")
    if not question_id:
        raise HTTPException(status_code=400, detail="question_id required")
    is_bookmarked = CodingService.toggle_bookmark(db, user_id=current_user.id, question_id=question_id)
    return {"is_bookmarked": is_bookmarked}

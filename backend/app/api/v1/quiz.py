from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.v1.auth import get_current_user
from app.services import quiz_service

router = APIRouter(prefix="/quiz", tags=["Quiz"])

@router.get("/domains")
def list_domains():
    """
    Returns supported domain names and question format types.
    """
    return {
        "domains": ["Aptitude", "SoftwareEngineering", "AIML", "DataScience", "CyberSecurity"],
        "question_types": ["theory", "code", "scenario", "all"]
    }

@router.post("/start")
def start_quiz(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Assembles an adaptive question set from the database for the given domain and format.
    """
    user_id = str(payload.get("user_id", "student_1"))
    raw_domain = payload.get("domain", "ai_ml")
    domains = payload.get("domains")
    if not domains:
        domains = [raw_domain] if isinstance(raw_domain, str) else raw_domain
        
    num_questions = int(payload.get("num_questions", 5))
    question_type = payload.get("question_type", "theory")

    # Auto-seed database if empty
    quiz_service.seed_questions_if_empty(db)

    quiz_id, questions = quiz_service.fetch_quiz_questions(
        db=db,
        user_id=user_id,
        domains=domains,
        num_questions=num_questions,
        question_type=question_type
    )

    question_dicts = [
        {
            "id": q.id,
            "question_id": str(q.id),
            "domain": q.domain,
            "question_type": q.question_type,
            "sub_topic": q.sub_topic,
            "difficulty": q.difficulty,
            "question": q.question_text,
            "question_text": q.question_text,
            "options": q.options,
            "source": q.source
        }
        for q in questions
    ]

    return {
        "quiz_id": quiz_id,
        "user_id": user_id,
        "domains": domains,
        "question_type": question_type,
        "total_questions": len(questions),
        "questions": question_dicts
    }

@router.post("/submit")
def submit_quiz(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Grades user answers, updates spaced-repetition state, and returns score + answer key.
    """
    user_id = str(payload.get("user_id", "student_1"))
    quiz_id = str(payload.get("quiz_id", ""))
    raw_answers = payload.get("answers", {})
    domains = payload.get("domains", ["General"])

    formatted_answers = []
    if isinstance(raw_answers, dict):
        for q_key, opt_val in raw_answers.items():
            try:
                clean_qid = int(str(q_key).replace("q_", "").replace("q", ""))
            except ValueError:
                continue

            opt_idx = 0
            if isinstance(opt_val, int):
                opt_idx = opt_val
            elif isinstance(opt_val, str):
                opt_str = opt_val.upper().strip()
                if opt_str in ("A", "0"): opt_idx = 0
                elif opt_str in ("B", "1"): opt_idx = 1
                elif opt_str in ("C", "2"): opt_idx = 2
                elif opt_str in ("D", "3"): opt_idx = 3

            formatted_answers.append({
                "question_id": clean_qid,
                "selected_option_index": opt_idx
            })
    elif isinstance(raw_answers, list):
        formatted_answers = raw_answers

    res = quiz_service.process_submission(
        db=db,
        user_id=user_id,
        quiz_id=quiz_id,
        domains=domains,
        answers=formatted_answers
    )
    return res

@router.get("/dashboard/{user_id}")
def get_dashboard(
    user_id: str,
    db: Session = Depends(get_db)
):
    return quiz_service.get_user_dashboard(db=db, user_id=user_id)

"""
app/routers/quiz.py
~~~~~~~~~~~~~~~~~~~
Quiz-related API endpoints:
  POST /api/quiz/start        – fetch adaptive question set
  POST /api/quiz/submit       – submit answers, get score + answer key
  GET  /api/quiz/dashboard/{user_id} – user dashboard stats
  GET  /api/quiz/domains      – list supported domains
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.question import DomainEnum, QuestionTypeEnum
from app.schemas.dashboard import DashboardResponse
from app.schemas.question import QuestionOut
from app.schemas.quiz import (
    DomainListResponse,
    QuizStartRequest,
    QuizStartResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services import dashboard_service, quiz_service, submission_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get(
    "/domains",
    response_model=DomainListResponse,
    summary="List Supported Domains",
    description="Returns all domain names and question types that can be used when starting a quiz.",
)
async def list_domains() -> DomainListResponse:
    return DomainListResponse(
        domains=[d.value for d in DomainEnum],
        question_types=[qt.value for qt in QuestionTypeEnum] + ["all"],
    )


@router.post(
    "/start",
    response_model=QuizStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Start Adaptive Quiz",
    description=(
        "Assembles an adaptive question set for the given user, domains, and optional question_type "
        "('theory', 'code', 'scenario', or 'all'/'mixed'). "
        "Up to 35% of questions will be from the user's learning queue "
        "(previously incorrect answers). The remaining slots are filled "
        "with unseen questions; if the bank is empty, Gemini generates fresh ones."
    ),
)
async def start_quiz(
    request: QuizStartRequest,
    db: DbDep,
) -> QuizStartResponse:
    domain_values = [d.value for d in request.domains]

    try:
        quiz_id, questions = await quiz_service.fetch_quiz_questions(
            db=db,
            user_id=request.user_id,
            domains=domain_values,
            num_questions=request.num_questions,
            question_type=request.question_type,
        )
    except RuntimeError as exc:
        logger.error("Quiz start failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No questions found for the requested domains and question type. "
                "Ensure seed data is loaded or a valid GEMINI_API_KEY is configured."
            ),
        )

    question_dicts = [
        QuestionOut.model_validate(q).model_dump()
        for q in questions
    ]

    return QuizStartResponse(
        quiz_id=quiz_id,
        user_id=request.user_id,
        domains=domain_values,
        question_type=request.question_type,
        total_questions=len(questions),
        questions=question_dicts,
    )


@router.post(
    "/submit",
    response_model=QuizSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit Quiz Answers",
    description=(
        "Accepts user answers, computes score, updates spaced-repetition state "
        "(mastered / learning), and returns a full answer key with explanations."
    ),
)
async def submit_quiz(
    request: QuizSubmitRequest,
    db: DbDep,
) -> QuizSubmitResponse:
    try:
        response = await submission_service.process_submission(db=db, request=request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Unexpected error during submission: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while processing submission.",
        )
    return response


@router.get(
    "/dashboard/{user_id}",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="User Dashboard Stats",
    description=(
        "Returns primary domain, overall accuracy, total mastered/learning counts, "
        "and a domain-by-domain breakdown of quiz performance."
    ),
)
async def get_dashboard(
    user_id: str,
    db: DbDep,
) -> DashboardResponse:
    return await dashboard_service.get_dashboard(db=db, user_id=user_id)

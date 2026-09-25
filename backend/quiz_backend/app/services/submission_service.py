"""
app/services/submission_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Handles quiz answer submission: grading, UserProgress updates,
QuizAttempt persistence, and answer-key generation.

Spaced-Repetition Update Rules
-------------------------------
- Correct answer  → consecutive_correct += 1
                    if consecutive_correct >= MASTERY_THRESHOLD → status = 'mastered'
- Incorrect answer → incorrect_count += 1
                     consecutive_correct = 0
                     status = 'learning'
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt, QuizAttemptDetail
from app.models.user_progress import ProgressStatusEnum, UserProgress
from app.schemas.quiz import AnswerKeyItem, QuizSubmitRequest, QuizSubmitResponse

logger = logging.getLogger(__name__)
settings = get_settings()


async def process_submission(
    db: AsyncSession,
    request: QuizSubmitRequest,
) -> QuizSubmitResponse:
    """
    Grade a quiz submission, persist results, update spaced-repetition state,
    and return a full response with score summary and per-question answer key.
    """
    user_id = request.user_id
    answer_map = {ans.question_id: ans.selected_option_index for ans in request.answers}
    question_ids = list(answer_map.keys())

    # ── Load questions ────────────────────────────────────────────────────────
    stmt = select(Question).where(Question.id.in_(question_ids))
    result = await db.execute(stmt)
    questions: dict[int, Question] = {q.id: q for q in result.scalars().all()}

    missing = set(question_ids) - set(questions.keys())
    if missing:
        raise ValueError(f"Question IDs not found: {missing}")

    # ── Load existing UserProgress rows ───────────────────────────────────────
    prog_stmt = select(UserProgress).where(
        UserProgress.user_id == user_id,
        UserProgress.question_id.in_(question_ids),
    )
    prog_result = await db.execute(prog_stmt)
    progress_map: dict[int, UserProgress] = {
        p.question_id: p for p in prog_result.scalars().all()
    }

    # ── Grade & update progress ───────────────────────────────────────────────
    score = 0
    answer_key_items: list[AnswerKeyItem] = []
    attempt_details: list[QuizAttemptDetail] = []
    attempt_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    for qid, selected_idx in answer_map.items():
        q = questions[qid]
        is_correct = selected_idx == q.correct_option_index
        points = 1 if is_correct else 0
        score += points

        # ── UserProgress upsert ───────────────────────────────────────────────
        progress = progress_map.get(qid)
        if progress is None:
            progress = UserProgress(
                user_id=user_id,
                question_id=qid,
                status=ProgressStatusEnum.learning,
                incorrect_count=0,
                consecutive_correct=0,
                last_reviewed_at=now,
            )
            db.add(progress)
            progress_map[qid] = progress

        if is_correct:
            progress.consecutive_correct += 1
            if progress.consecutive_correct >= settings.MASTERY_THRESHOLD:
                progress.status = ProgressStatusEnum.mastered
                logger.debug("Question %d mastered by user %s", qid, user_id)
            else:
                progress.status = ProgressStatusEnum.learning
        else:
            progress.incorrect_count += 1
            progress.consecutive_correct = 0
            progress.status = ProgressStatusEnum.learning

        progress.last_reviewed_at = now

        # ── AttemptDetail row ─────────────────────────────────────────────────
        attempt_details.append(
            QuizAttemptDetail(
                attempt_id=attempt_id,
                question_id=qid,
                selected_option_index=selected_idx,
                is_correct=is_correct,
            )
        )

        # ── Answer key ────────────────────────────────────────────────────────
        answer_key_items.append(
            AnswerKeyItem(
                question_id=qid,
                question_text=q.question_text,
                options=q.options,
                correct_option_index=q.correct_option_index,
                selected_option_index=selected_idx,
                is_correct=is_correct,
                explanation=q.explanation,
                domain=q.domain,
                question_type=q.question_type or "theory",
                sub_topic=q.sub_topic,
                difficulty=q.difficulty,
                points_earned=points,
            )
        )

    total = len(question_ids)
    percentage = round((score / total) * 100, 2) if total else 0.0
    domains_str = [d.value if hasattr(d, "value") else d for d in request.domains]

    # ── Persist QuizAttempt ───────────────────────────────────────────────────
    attempt = QuizAttempt(
        attempt_id=attempt_id,
        user_id=user_id,
        domain=",".join(domains_str),
        total_questions=total,
        score=score,
        percentage=percentage,
        submitted_at=now,
    )
    db.add(attempt)

    for detail in attempt_details:
        db.add(detail)

    await db.commit()
    logger.info(
        "Attempt %s: user=%s score=%d/%d (%.1f%%)",
        attempt_id, user_id, score, total, percentage,
    )

    return QuizSubmitResponse(
        attempt_id=attempt_id,
        user_id=user_id,
        quiz_id=request.quiz_id,
        domains=domains_str,
        total_questions=total,
        score=score,
        percentage=percentage,
        points_earned=score,
        submitted_at=now,
        answer_key=answer_key_items,
    )

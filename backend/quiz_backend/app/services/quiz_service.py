"""
app/services/quiz_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Spaced-repetition engine responsible for assembling an adaptive
question set for a user quiz session.

Algorithm
---------
1. Determine how many "review" slots (previously-failed questions) to fill.
2. Pull up to REVIEW_SLOT_RATIO × N questions from UserProgress where
   status = 'learning', ordered by last_reviewed_at ASC (stalest first).
   Filters by domain and optionally by question_type ('theory', 'code', 'scenario').
3. Collect all question IDs the user has ever seen.
4. Fill remaining slots from unseen questions in the requested domains (and question_type),
   distributed evenly across domains (round-robin by difficulty weight).
5. If still short, call Gemini to generate a fresh batch, persist them,
   and fill the gap.
6. Return shuffled final list.
"""

import logging
import math
import random
import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core import gemini as gemini_client
from app.models.question import DomainEnum, Question, QuestionTypeEnum
from app.models.user_progress import ProgressStatusEnum, UserProgress

logger = logging.getLogger(__name__)
settings = get_settings()


async def fetch_quiz_questions(
    db: AsyncSession,
    user_id: str,
    domains: list[str],
    num_questions: int,
    question_type: Optional[str] = None,
) -> tuple[str, list[Question]]:
    """
    Build an adaptive question set and return (quiz_id, questions).

    Parameters
    ----------
    db            : Async database session.
    user_id       : Identifier of the requesting user.
    domains       : List of domain strings (validated DomainEnum values).
    num_questions : Total number of questions to return.
    question_type : Optional filter ('theory', 'code', 'scenario', or 'all'/'mixed'/None).

    Returns
    -------
    A tuple of (quiz_id: str, questions: list[Question]).
    """
    quiz_id = str(uuid.uuid4())
    
    # Normalize question_type filter
    q_type_filter: Optional[str] = None
    if question_type and question_type.lower() not in ("all", "mixed", "none"):
        q_type_filter = question_type.lower()

    review_slots = math.floor(num_questions * settings.REVIEW_SLOT_RATIO)
    fresh_slots = num_questions - review_slots

    # ── Step 1: Review questions (learning queue) ─────────────────────────────
    review_qs = await _fetch_review_questions(db, user_id, domains, q_type_filter, review_slots)
    logger.info("Review slots: requested=%d filled=%d (type_filter=%s)", review_slots, len(review_qs), q_type_filter)

    # ── Step 2: Seen question IDs (to exclude from fresh pull) ────────────────
    seen_ids = await _get_seen_question_ids(db, user_id)
    # Exclude questions already picked for review
    seen_ids.update(q.id for q in review_qs)

    # ── Step 3: Fresh unseen questions ────────────────────────────────────────
    actual_fresh = num_questions - len(review_qs)
    fresh_qs = await _fetch_unseen_questions(db, domains, q_type_filter, seen_ids, actual_fresh)
    logger.info("Fresh slots: requested=%d filled=%d", actual_fresh, len(fresh_qs))

    # ── Step 4: AI generation if still short ─────────────────────────────────
    still_needed = num_questions - len(review_qs) - len(fresh_qs)
    if still_needed > 0:
        logger.info("Bank ran dry — requesting %d questions from Gemini (type=%s).", still_needed, q_type_filter or "theory")
        ai_qs = await _generate_and_persist_questions(db, domains, q_type_filter or "theory", still_needed, seen_ids)
        fresh_qs.extend(ai_qs)
        logger.info("AI generation contributed %d questions.", len(ai_qs))

    combined = review_qs + fresh_qs
    random.shuffle(combined)
    return quiz_id, combined[:num_questions]


# ── Private helpers ────────────────────────────────────────────────────────────

async def _fetch_review_questions(
    db: AsyncSession,
    user_id: str,
    domains: list[str],
    question_type: Optional[str],
    limit: int,
) -> list[Question]:
    """Pull the stalest 'learning' questions for the user in the given domains and optional type."""
    if limit <= 0:
        return []

    conditions = [
        UserProgress.user_id == user_id,
        UserProgress.status == ProgressStatusEnum.learning,
        Question.domain.in_(domains),
    ]
    if question_type:
        conditions.append(Question.question_type == question_type)

    stmt = (
        select(Question)
        .join(UserProgress, UserProgress.question_id == Question.id)
        .where(*conditions)
        .order_by(UserProgress.last_reviewed_at.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _get_seen_question_ids(db: AsyncSession, user_id: str) -> set[int]:
    """Return the set of question IDs the user has interacted with."""
    stmt = select(UserProgress.question_id).where(UserProgress.user_id == user_id)
    result = await db.execute(stmt)
    return set(result.scalars().all())


async def _fetch_unseen_questions(
    db: AsyncSession,
    domains: list[str],
    question_type: Optional[str],
    exclude_ids: set[int],
    limit: int,
) -> list[Question]:
    """Fetch unseen questions from the DB, balanced across domains."""
    if limit <= 0:
        return []

    per_domain = math.ceil(limit / len(domains))
    collected: list[Question] = []

    for domain in domains:
        remaining = limit - len(collected)
        if remaining <= 0:
            break
        take = min(per_domain, remaining)
        
        conditions = [Question.domain == domain]
        if question_type:
            conditions.append(Question.question_type == question_type)
        if exclude_ids:
            conditions.append(Question.id.not_in(exclude_ids))

        stmt = (
            select(Question)
            .where(*conditions)
            .order_by(Question.id)
            .limit(take)
        )
        result = await db.execute(stmt)
        rows = list(result.scalars().all())
        collected.extend(rows)
        exclude_ids.update(q.id for q in rows)

    return collected


async def _generate_and_persist_questions(
    db: AsyncSession,
    domains: list[str],
    question_type: str,
    needed: int,
    exclude_ids: set[int],
) -> list[Question]:
    """Ask Gemini to generate questions, bulk-insert them, and return ORM objects."""
    per_domain = math.ceil(needed / len(domains))
    batch_size = max(per_domain, settings.AI_GENERATION_BATCH_SIZE)

    sub_topics_map = {
        "Aptitude": "Mixed (Percentages, Ratios, Time-Speed-Distance, Probability, Number Systems)",
        "SoftwareEngineering": "Mixed (Design Patterns, SOLID, Testing, Git, REST, Algorithms)",
        "AIML": "Mixed (Loss Functions, Optimisers, Model Evaluation, NLP, Neural Networks)",
        "DataScience": "Mixed (Statistics, Pandas, SQL, Visualisation, Feature Engineering)",
        "CyberSecurity": "Mixed (OWASP, Encryption, Network Security, Vulnerabilities, JWT)",
    }

    new_questions: list[Question] = []

    for domain in domains:
        remaining = needed - len(new_questions)
        if remaining <= 0:
            break
        count = min(batch_size, remaining + 5)  # generate a few extra for buffer
        sub_topic = sub_topics_map.get(domain, "General")

        try:
            generated = await gemini_client.generate_questions(
                domain=domain,
                sub_topic=sub_topic,
                question_type=question_type,
                difficulty="medium",
                count=count,
            )
        except RuntimeError as exc:
            logger.error("Gemini generation failed for domain %s: %s", domain, exc)
            continue

        # Bulk insert
        for q_data in generated:
            q = Question(**q_data)
            db.add(q)

        await db.flush()  # get IDs without full commit

        # Re-query the freshly inserted questions to get their IDs
        conditions = [
            Question.domain == domain,
            Question.source == "AI_Generated",
        ]
        if question_type:
            conditions.append(Question.question_type == question_type)
        if exclude_ids:
            conditions.append(Question.id.not_in(exclude_ids))

        stmt = (
            select(Question)
            .where(*conditions)
            .order_by(Question.id.desc())
            .limit(count)
        )
        result = await db.execute(stmt)
        fresh = list(result.scalars().all())
        new_questions.extend(fresh[:remaining])
        exclude_ids.update(q.id for q in fresh)

    return new_questions

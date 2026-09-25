"""
app/services/dashboard_service.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Aggregates QuizAttempt and UserProgress data into a
domain-wise dashboard for a given user.
"""

import logging
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz_attempt import QuizAttempt, QuizAttemptDetail
from app.models.user_progress import ProgressStatusEnum, UserProgress
from app.models.question import Question
from app.schemas.dashboard import DashboardResponse, DomainStat

logger = logging.getLogger(__name__)


async def get_dashboard(db: AsyncSession, user_id: str) -> DashboardResponse:
    """
    Build and return the dashboard stats for a user.

    Aggregation strategy:
    - Per-domain attempt counts come from QuizAttemptDetail joined to Question.
    - Learning / mastered counts come from UserProgress.
    - Overall accuracy is computed from total correct / total attempted.
    """

    # ── 1. Load all QuizAttempts for the user ─────────────────────────────────
    attempt_stmt = select(QuizAttempt).where(QuizAttempt.user_id == user_id)
    attempt_result = await db.execute(attempt_stmt)
    attempts = attempt_result.scalars().all()

    total_quizzes = len(attempts)
    attempt_ids = [a.attempt_id for a in attempts]

    # ── 2. Load QuizAttemptDetails with Question data ─────────────────────────
    # domain_stats[domain] = {"attempted": 0, "correct": 0, "sessions": set()}
    domain_stats: dict[str, dict] = defaultdict(
        lambda: {"attempted": 0, "correct": 0, "sessions": set()}
    )

    if attempt_ids:
        detail_stmt = (
            select(QuizAttemptDetail, Question)
            .join(Question, QuizAttemptDetail.question_id == Question.id)
            .where(QuizAttemptDetail.attempt_id.in_(attempt_ids))
        )
        detail_result = await db.execute(detail_stmt)
        rows = detail_result.all()

        for detail, question in rows:
            d = question.domain
            domain_stats[d]["attempted"] += 1
            if detail.is_correct:
                domain_stats[d]["correct"] += 1
            domain_stats[d]["sessions"].add(detail.attempt_id)

    # ── 3. Load UserProgress for learning / mastered counts ───────────────────
    progress_stmt = (
        select(UserProgress, Question)
        .join(Question, UserProgress.question_id == Question.id)
        .where(UserProgress.user_id == user_id)
    )
    progress_result = await db.execute(progress_stmt)
    progress_rows = progress_result.all()

    # domain_progress[domain] = {"mastered": 0, "learning": 0}
    domain_progress: dict[str, dict] = defaultdict(lambda: {"mastered": 0, "learning": 0})
    for progress, question in progress_rows:
        d = question.domain
        if progress.status == ProgressStatusEnum.mastered:
            domain_progress[d]["mastered"] += 1
        else:
            domain_progress[d]["learning"] += 1

    # ── 4. Build per-domain stats ─────────────────────────────────────────────
    all_domains = set(domain_stats.keys()) | set(domain_progress.keys())
    stat_list: list[DomainStat] = []

    for domain in sorted(all_domains):
        ds = domain_stats.get(domain, {"attempted": 0, "correct": 0, "sessions": set()})
        dp = domain_progress.get(domain, {"mastered": 0, "learning": 0})

        attempted = ds["attempted"]
        correct = ds["correct"]
        incorrect = attempted - correct
        accuracy = round((correct / attempted * 100), 2) if attempted else 0.0

        stat_list.append(
            DomainStat(
                domain=domain,
                total_attempted=attempted,
                correct=correct,
                incorrect=incorrect,
                accuracy_pct=accuracy,
                mastered_count=dp["mastered"],
                learning_count=dp["learning"],
                quiz_sessions=len(ds["sessions"]),
            )
        )

    # ── 5. Overall aggregates ─────────────────────────────────────────────────
    total_attempted = sum(s.total_attempted for s in stat_list)
    total_correct = sum(s.correct for s in stat_list)
    total_mastered = sum(s.mastered_count for s in stat_list)
    total_learning = sum(s.learning_count for s in stat_list)
    overall_accuracy = round((total_correct / total_attempted * 100), 2) if total_attempted else 0.0

    # Primary domain = domain with the most questions attempted
    primary_domain = (
        max(stat_list, key=lambda s: s.total_attempted).domain
        if stat_list else "N/A"
    )

    return DashboardResponse(
        user_id=user_id,
        total_quizzes=total_quizzes,
        total_questions_attempted=total_attempted,
        overall_accuracy_pct=overall_accuracy,
        total_mastered=total_mastered,
        total_learning=total_learning,
        primary_domain=primary_domain,
        domain_stats=stat_list,
    )

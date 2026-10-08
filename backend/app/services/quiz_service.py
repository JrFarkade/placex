import math
import random
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.quiz import Question, QuizAttempt, QuizAttemptDetail, UserProgress

logger = logging.getLogger(__name__)

MASTERY_THRESHOLD = 2
REVIEW_SLOT_RATIO = 0.35

# Cache of recently served question IDs per (user_id, domain) to prevent repeating questions across attempts
_recent_user_quiz_questions: Dict[str, List[int]] = {}

def fetch_quiz_questions(
    db: Session,
    user_id: str,
    domains: List[str],
    num_questions: int,
    question_type: Optional[str] = None
) -> tuple[str, List[Question]]:
    """
    Build an adaptive, randomized question set from the database for the given domain and return (quiz_id, questions).
    Every quiz attempt selects a new randomized set of 5 questions from the existing question bank,
    ensuring consecutive attempts receive completely different question sets without repetition.
    """
    quiz_id = str(uuid.uuid4())
    
    q_type_filter = None
    if question_type and question_type.lower() not in ("all", "mixed", "none", "any"):
        q_type_filter = question_type.lower()

    # Normalize domain strings to match database entries
    normalized_domains = []
    domain_map = {
        "aptitude": "Aptitude",
        "quantitative aptitude": "Aptitude",
        "softwareengineering": "SoftwareEngineering",
        "software_engineering": "SoftwareEngineering",
        "web_dev": "SoftwareEngineering",
        "web development": "SoftwareEngineering",
        "aiml": "AIML",
        "ai_ml": "AIML",
        "ai/ml": "AIML",
        "machine learning": "AIML",
        "datascience": "DataScience",
        "data_science": "DataScience",
        "data science": "DataScience",
        "cybersecurity": "CyberSecurity",
        "cyber_security": "CyberSecurity",
        "python": "Python",
        "python_programming": "Python",
        "python programming": "Python"
    }
    for d in domains:
        d_clean = d.strip()
        norm = domain_map.get(d_clean.lower(), d_clean)
        normalized_domains.append(norm)

    # 1. Query all eligible questions for the selected domain(s)
    query = db.query(Question)
    if normalized_domains:
        query = query.filter(Question.domain.in_(normalized_domains))
    if q_type_filter:
        query = query.filter(Question.question_type == q_type_filter)

    available_qs = query.all()

    # Fallback to domain without question_type filter if not enough matching
    if len(available_qs) < num_questions and q_type_filter:
        available_qs = db.query(Question).filter(Question.domain.in_(normalized_domains)).all()

    if not available_qs:
        return quiz_id, []

    # 2. Prevent question repetition across consecutive quiz attempts for the user
    cache_key = f"{user_id}:" + ":".join(sorted(normalized_domains))
    recent_ids = set(_recent_user_quiz_questions.get(cache_key, []))

    # Identify questions from the pool that were not in recent attempts
    unseen_qs = [q for q in available_qs if q.id not in recent_ids]

    if len(unseen_qs) >= num_questions:
        # Fully unique question set from unasked questions in pool
        selected_qs = random.sample(unseen_qs, num_questions)
    elif len(available_qs) > num_questions:
        # Partially fill with all remaining unseen, then randomly sample rest from available pool
        remaining_pool = [q for q in available_qs if q not in unseen_qs]
        needed = num_questions - len(unseen_qs)
        selected_qs = unseen_qs + random.sample(remaining_pool, needed)
    else:
        # Pool size is smaller than or equal to num_questions
        selected_qs = random.sample(available_qs, len(available_qs))

    # 3. Update recently served tracking buffer
    new_served_ids = [q.id for q in selected_qs]
    current_recents = _recent_user_quiz_questions.get(cache_key, []) + new_served_ids
    # Retain up to (pool_size - num_questions) so the pool cycles smoothly
    max_history = max(len(available_qs) - num_questions, num_questions)
    if len(current_recents) > max_history:
        current_recents = current_recents[-max_history:]
    _recent_user_quiz_questions[cache_key] = current_recents

    return quiz_id, selected_qs

def _fetch_review_questions(
    db: Session,
    user_id: str,
    domains: List[str],
    question_type: Optional[str],
    limit: int
) -> List[Question]:
    if limit <= 0:
        return []

    query = db.query(Question).join(UserProgress, UserProgress.question_id == Question.id)\
        .filter(UserProgress.user_id == user_id, UserProgress.status == "learning")
    
    if domains:
        query = query.filter(Question.domain.in_(domains))
    if question_type:
        query = query.filter(Question.question_type == question_type)

    return query.order_by(UserProgress.last_reviewed_at.asc()).limit(limit).all()

def _fetch_unseen_questions(
    db: Session,
    domains: List[str],
    question_type: Optional[str],
    exclude_ids: set,
    limit: int
) -> List[Question]:
    if limit <= 0:
        return []

    query = db.query(Question)
    if domains:
        query = query.filter(Question.domain.in_(domains))
    if question_type:
        query = query.filter(Question.question_type == question_type)
    if exclude_ids:
        query = query.filter(~Question.id.in_(exclude_ids))

    return query.order_by(Question.id.asc()).limit(limit).all()

def process_submission(
    db: Session,
    user_id: str,
    quiz_id: str,
    domains: List[str],
    answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Grade answers with robust option matching (by index, string text, or letter),
    update spaced repetition state, and return a complete answer key with explanations.
    """
    question_ids = [item["question_id"] for item in answers if "question_id" in item]

    questions_list = db.query(Question).filter(Question.id.in_(question_ids)).all() if question_ids else []
    questions = {q.id: q for q in questions_list}

    progress_list = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.question_id.in_(question_ids)
    ).all() if question_ids else []
    progress_map = {p.question_id: p for p in progress_list}

    score = 0
    answer_key = []
    explanations_map = {}
    attempt_details = []
    attempt_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    for item in answers:
        qid = item.get("question_id")
        val = item.get("selected_value")
        q = questions.get(qid)
        if not q:
            continue

        selected_idx = -1
        if isinstance(val, int) and 0 <= val < len(q.options):
            selected_idx = val
        elif isinstance(val, str):
            val_clean = val.strip()
            if val_clean in q.options:
                selected_idx = q.options.index(val_clean)
            else:
                match_found = False
                for idx, opt_str in enumerate(q.options):
                    if str(opt_str).strip().lower() == val_clean.lower():
                        selected_idx = idx
                        match_found = True
                        break
                if not match_found and val_clean.upper() in ("A", "B", "C", "D"):
                    letter_map = {"A": 0, "B": 1, "C": 2, "D": 3}
                    selected_idx = letter_map[val_clean.upper()]

        is_unanswered = (selected_idx < 0 or selected_idx >= len(q.options))
        is_correct = (not is_unanswered) and (selected_idx == q.correct_option_index)
        points = 1 if is_correct else 0
        if is_correct:
            score += 1

        selected_letter = chr(65 + selected_idx) if (0 <= selected_idx < len(q.options)) else ""
        selected_text = q.options[selected_idx] if (0 <= selected_idx < len(q.options)) else "Not Answered"
        selected_answer_formatted = f"({selected_letter}) {selected_text}" if selected_letter else "Not Answered"

        correct_letter = chr(65 + q.correct_option_index) if (0 <= q.correct_option_index < len(q.options)) else ""
        correct_text = q.options[q.correct_option_index] if (0 <= q.correct_option_index < len(q.options)) else ""
        correct_answer_formatted = f"({correct_letter}) {correct_text}" if correct_letter else correct_text

        status_str = "unanswered" if is_unanswered else ("correct" if is_correct else "incorrect")

        # Update Spaced Repetition (UserProgress)
        prog = progress_map.get(qid)
        if not prog:
            prog = UserProgress(
                user_id=user_id,
                question_id=qid,
                status="learning",
                incorrect_count=0,
                consecutive_correct=0,
                last_reviewed_at=now
            )
            db.add(prog)
            progress_map[qid] = prog

        if is_correct:
            prog.consecutive_correct += 1
            if prog.consecutive_correct >= MASTERY_THRESHOLD:
                prog.status = "mastered"
            else:
                prog.status = "learning"
        else:
            prog.incorrect_count += 1
            prog.consecutive_correct = 0
            prog.status = "learning"

        prog.last_reviewed_at = now

        # Details for database persistence
        attempt_details.append(
            QuizAttemptDetail(
                attempt_id=attempt_id,
                question_id=qid,
                selected_option_index=selected_idx,
                is_correct=is_correct
            )
        )

        explanations_map[str(qid)] = q.explanation or f"Correct answer is '{correct_answer_formatted}'."

        answer_key.append({
            "question_id": qid,
            "question_text": q.question_text,
            "options": q.options,
            "correct_option_index": q.correct_option_index,
            "correct_option_letter": correct_letter,
            "correct_answer": correct_answer_formatted,
            "selected_option_index": selected_idx,
            "selected_option_letter": selected_letter,
            "selected_answer": selected_answer_formatted,
            "is_correct": is_correct,
            "status": status_str,
            "explanation": q.explanation or f"Correct answer is '{correct_answer_formatted}'.",
            "domain": q.domain,
            "question_type": q.question_type,
            "sub_topic": q.sub_topic,
            "difficulty": q.difficulty,
            "points_earned": points
        })

    total = len(question_ids)
    percentage = round((score / total) * 100, 2) if total > 0 else 0.0

    attempt = QuizAttempt(
        attempt_id=attempt_id,
        user_id=user_id,
        domain=",".join(domains) if domains else "General",
        total_questions=total,
        score=score,
        percentage=percentage,
        submitted_at=now
    )
    db.add(attempt)
    for detail in attempt_details:
        db.add(detail)

    db.commit()

    return {
        "attempt_id": attempt_id,
        "user_id": user_id,
        "quiz_id": quiz_id,
        "domains": domains,
        "total_questions": total,
        "score": score,
        "percentage": percentage,
        "points_earned": score,
        "submitted_at": now.isoformat(),
        "explanations": explanations_map,
        "answer_key": answer_key
    }

def get_user_dashboard(db: Session, user_id: str) -> Dict[str, Any]:
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).order_by(QuizAttempt.submitted_at.desc()).all()
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).all()

    total_attempts = len(attempts)
    total_mastered = sum(1 for p in progress if p.status == "mastered")
    total_learning = sum(1 for p in progress if p.status == "learning")
    
    avg_score = round(sum(a.percentage for a in attempts) / total_attempts, 1) if total_attempts > 0 else 0.0

    history = [
        {
            "attempt_id": a.attempt_id,
            "domain": a.domain,
            "score": a.score,
            "total_questions": a.total_questions,
            "percentage": a.percentage,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else ""
        }
        for a in attempts[:10]
    ]

    return {
        "user_id": user_id,
        "total_attempts": total_attempts,
        "average_accuracy": avg_score,
        "total_mastered": total_mastered,
        "total_learning": total_learning,
        "history": history
    }

def seed_questions_if_empty(db: Session):
    try:
        count = db.query(Question).count()
        if count == 0:
            logger.info("Seeding Quiz questions database...")
            import ast
            import os
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            seed_path = os.path.join(backend_dir, "quiz_backend", "app", "seed_data.py")
            if os.path.exists(seed_path):
                tree = ast.parse(open(seed_path, encoding="utf-8").read())
                seed_nodes = [node for node in tree.body if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", None) == "SEED_QUESTIONS"]
                if seed_nodes:
                    seed_questions = ast.literal_eval(seed_nodes[0].value)
                    for q_data in seed_questions:
                        q = Question(
                            domain=q_data.get("domain", "Aptitude"),
                            question_type=q_data.get("question_type", "theory"),
                            sub_topic=q_data.get("sub_topic", "General"),
                            difficulty=q_data.get("difficulty", "medium"),
                            question_text=q_data.get("question_text", ""),
                            options=q_data.get("options", []),
                            correct_option_index=q_data.get("correct_option_index", 0),
                            explanation=q_data.get("explanation", ""),
                            source=q_data.get("source", "Curated")
                        )
                        db.add(q)
                    db.commit()
                    logger.info("Successfully seeded %d curated quiz questions into database.", len(seed_questions))
    except Exception as e:
        logger.error("Failed seeding quiz questions: %s", e)

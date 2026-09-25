from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.memory import StudentMemory

class MemoryManager:
    """
    Manages dual-layer memory (Short-term session context & Long-term persistent JSON profile).
    """

    @staticmethod
    def get_memory(db: Session, user_id: int) -> Dict[str, Any]:
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if not mem:
            mem = StudentMemory(
                user_id=user_id,
                short_term_context={"current_feature": "dashboard"},
                long_term_memory={
                    "user_id": user_id,
                    "target_company": None,
                    "target_role": None,
                    "skills": [],
                    "readiness_score": None,
                    "readiness_level": "Not Calculated",
                    "resume_score": None,
                    "coding_solved": 0,
                    "completed_interviews": 0
                }
            )
            db.add(mem)
            db.commit()
            db.refresh(mem)
        
        return {
            "short_term": mem.short_term_context or {},
            "long_term": mem.long_term_memory or {}
        }

    @staticmethod
    def update_short_term(db: Session, user_id: int, key: str, value: Any):
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if mem:
            context = dict(mem.short_term_context or {})
            context[key] = value
            mem.short_term_context = context
            db.commit()

    @staticmethod
    def update_long_term(db: Session, user_id: int, updates: Dict[str, Any]):
        mem = db.query(StudentMemory).filter(StudentMemory.user_id == user_id).first()
        if mem:
            long_mem = dict(mem.long_term_memory or {})
            long_mem.update(updates)
            mem.long_term_memory = long_mem
            db.commit()

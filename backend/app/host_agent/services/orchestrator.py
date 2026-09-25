import time
import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.host_agent.core.intent_engine import IntentEngine, IntentCategory
from app.host_agent.memory.memory_manager import MemoryManager
from app.host_agent.services.gemini_service import GeminiService
from app.models.memory import HostLog
from app.models.profile import StudentProfile

class HostAgentOrchestrator:
    """
    Central reasoning engine and coordinator of PlaceX AI Career Operating System powered by Google Gemini API.
    Performs adaptive onboarding, skill gap analysis, role-specific roadmap planning, and smart service execution.
    """

    @staticmethod
    def process_request(db: Session, user_id: int, message: str, active_feature: str = "dashboard") -> Dict[str, Any]:
        start_time = time.time()

        # 1. Load Student Memory & Context
        memory = MemoryManager.get_memory(db, user_id)
        long_term = memory["long_term"]
        short_term = memory["short_term"]

        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        student_name = long_term.get("name") or (profile.user.full_name if profile and profile.user else "Student")

        msg_lower = message.lower()

        # 2. Extract & Update Profile Attributes (Target Role, Field, Year, Known Skills)
        previous_role = long_term.get("target_role")
        role_switch_requested = False

        if "data analyst" in msg_lower:
            new_role = "Data Analyst"
            if previous_role and previous_role != new_role and "switch" not in msg_lower and "yes" not in msg_lower:
                role_switch_requested = True
            else:
                MemoryManager.update_long_term(db, user_id, {"target_role": new_role})
                if profile:
                    profile.target_role = new_role
                    db.commit()

        elif "software engineer" in msg_lower or "sde" in msg_lower:
            new_role = "Software Development Engineer (SDE)"
            if previous_role and previous_role != new_role and "switch" not in msg_lower and "yes" not in msg_lower:
                role_switch_requested = True
            else:
                MemoryManager.update_long_term(db, user_id, {"target_role": new_role})
                if profile:
                    profile.target_role = new_role
                    db.commit()

        elif "product analyst" in msg_lower or "product manager" in msg_lower:
            new_role = "Product Analyst"
            if previous_role and previous_role != new_role and "switch" not in msg_lower and "yes" not in msg_lower:
                role_switch_requested = True
            else:
                MemoryManager.update_long_term(db, user_id, {"target_role": new_role})
                if profile:
                    profile.target_role = new_role
                    db.commit()

        # Extract Field of Study
        for fld in ["computer science", "data science", "information technology", "ai engineering", "ece", "electrical"]:
            if fld in msg_lower:
                MemoryManager.update_long_term(db, user_id, {"field_of_study": fld.title()})
                if profile:
                    profile.branch = fld.title()
                    db.commit()
                break

        # Extract Academic Year
        for yr in ["1st year", "2nd year", "3rd year", "4th year", "freshman", "sophomore", "junior", "senior"]:
            if yr in msg_lower:
                MemoryManager.update_long_term(db, user_id, {"academic_year": yr.title()})
                break

        # Extract Skills explicitly mentioned by student in conversation
        existing_skills = set(long_term.get("skills", []))
        detected_skills = []
        for sk in ["sql", "python", "excel", "power bi", "tableau", "pandas", "numpy", "c++", "java", "react", "html", "fastapi", "git", "statistics"]:
            if re.search(r'\b' + re.escape(sk) + r'\b', msg_lower):
                detected_skills.append(sk.upper() if sk in ["sql", "html"] else sk.title())
        
        if detected_skills:
            updated_skills = list(existing_skills.union(detected_skills))
            MemoryManager.update_long_term(db, user_id, {"skills": updated_skills})
            if profile:
                profile.skills = updated_skills
                db.commit()

        # Reload updated memory
        long_term = MemoryManager.get_memory(db, user_id)["long_term"]

        # 3. Dynamic Contextual Quick Actions (Max 3-4 UI Control Buttons)
        target_role = long_term.get("target_role")
        resume_score = long_term.get("resume_score")
        skills = long_term.get("skills", [])

        recommendations: List[str] = []

        if role_switch_requested:
            recommendations = ["Yes, Switch Goal", "Keep Current Role"]
        elif not target_role:
            recommendations = ["Data Analyst", "Software Engineer", "Product Analyst", "I'm not sure yet"]
        elif not skills:
            recommendations = ["Assess My Skills", "Upload Resume", "Build Roadmap"]
        elif resume_score is None:
            recommendations = ["Upload Resume", "Build Roadmap", "Practice Skills"]
        else:
            recommendations = ["Improve Resume", "Build Roadmap", "Practice Coding", "Start Mock Interview"]

        # 4. Intent Classification & Service Payload Assembly
        intent = IntentEngine.classify_intent(message, active_feature)
        services_executed: List[str] = ["Google Gemini Host Intelligence"]
        domain_context = ""

        if intent == IntentCategory.RESUME and any(k in msg_lower for k in ["resume", "cv", "ats", "upload"]):
            services_executed.append("Resume Intelligence Service")
            if resume_score is not None:
                domain_context = f"\n[Resume Intelligence]: Native ATS Score is {resume_score}/100."
            else:
                domain_context = "\n[Resume Intelligence]: No resume analyzed yet."

        elif intent == IntentCategory.CODING and any(k in msg_lower for k in ["coding", "code", "problem", "solve", "dsa", "leetcode"]):
            services_executed.append("Coding Intelligence Service")
            coding_solved = long_term.get("coding_solved", 0)
            domain_context = f"\n[Coding Intelligence]: Submissions completed: {coding_solved}."

        elif intent == IntentCategory.INTERVIEW and any(k in msg_lower for k in ["interview", "mock", "speaking", "hr"]):
            services_executed.append("Interview Intelligence Service")
            completed_interviews = long_term.get("completed_interviews", 0)
            domain_context = f"\n[Interview Intelligence]: Completed sessions: {completed_interviews}."

        elif intent == IntentCategory.ROADMAP and any(k in msg_lower for k in ["roadmap", "plan", "phases", "study plan"]):
            services_executed.append("Learning Intelligence Engine")
            readiness_score = long_term.get("readiness_score")
            domain_context = f"\n[Learning Intelligence]: Placement Readiness is {readiness_score or 'Not Calculated'}."

        # 5. Call Gemini LLM Reasoning Engine
        gemini_res = GeminiService.generate_response(
            user_message=message + domain_context,
            student_name=student_name,
            long_term_memory=long_term,
            short_term_context=short_term
        )

        reply = gemini_res["reply"]
        mermaid_code = gemini_res["mermaid_code"]
        processing_time = round(time.time() - start_time, 4)

        # 6. Log Action in Database
        log = HostLog(
            user_id=user_id,
            intent=intent,
            services_executed=services_executed,
            processing_time=processing_time,
            prompt_tokens=140,
            completion_tokens=85
        )
        db.add(log)
        db.commit()

        MemoryManager.update_short_term(db, user_id, "last_intent", intent)

        return {
            "status": "success",
            "intent": intent,
            "reply": reply,
            "mermaid_code": mermaid_code,
            "services_executed": services_executed,
            "recommendations": recommendations[:4],  # Max 3-4 dynamic UI controls
            "processing_time": processing_time
        }

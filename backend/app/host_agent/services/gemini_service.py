import os
import re
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.host_agent.prompt_manager.prompt_manager import PromptManager

class GeminiService:
    """
    Server-side Google Gemini LLM Integration for PlaceX Host Agent.
    Handles adaptive onboarding, role-specific career reasoning, and clean Mermaid.js roadmap generation.
    """

    @classmethod
    def generate_response(
        cls,
        user_message: str,
        student_name: str,
        long_term_memory: Dict[str, Any],
        short_term_context: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        api_key = settings.GEMINI_API_KEY
        configured_model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"

        system_instruction = PromptManager.get_host_prompt()
        
        target_role = long_term_memory.get("target_role") or "Not Set"
        field_of_study = long_term_memory.get("field_of_study") or "Not Set"
        academic_year = long_term_memory.get("academic_year") or "Not Set"
        mastered_skills = long_term_memory.get("skills", [])
        mastered_skills_str = ", ".join(mastered_skills) if mastered_skills else "None recorded yet"
        readiness_score = long_term_memory.get("readiness_score")
        readiness_str = f"{readiness_score}/100" if readiness_score is not None else "Not Calculated"

        context_prompt = f"""[STUDENT PROFILE CONTEXT]
Name: {student_name}
Target Role: {target_role}
Field of Study: {field_of_study}
Academic Year: {academic_year}
Mastered Skills: {mastered_skills_str}
Placement Readiness Score: {readiness_str}
Resume ATS Score: {long_term_memory.get('resume_score') or 'No resume uploaded yet'}
Coding Solved: {long_term_memory.get('coding_solved', 0)}
Interviews Completed: {long_term_memory.get('completed_interviews', 0)}

[STUDENT MESSAGE]
{user_message}"""

        gemini_reply = ""
        mermaid_code = ""

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                
                models_to_try = [
                    configured_model,
                    "gemini-1.5-flash-latest",
                    "gemini-2.0-flash",
                    "gemini-1.5-pro-latest",
                    "gemini-1.0-pro"
                ]
                
                for m_name in models_to_try:
                    try:
                        model = genai.GenerativeModel(
                            model_name=m_name,
                            system_instruction=system_instruction
                        )
                        response = model.generate_content(context_prompt)
                        if response and response.text:
                            gemini_reply = response.text.strip()
                            break
                    except Exception:
                        continue

            except Exception as e:
                print(f"[Gemini Service Warning]: {e}")

        # Intelligent Fallback reasoning if Gemini API key is missing or offline
        if not gemini_reply:
            gemini_reply = cls._intelligent_fallback_reasoning(user_message, long_term_memory)

        # Extract Mermaid code if generated
        mermaid_match = re.search(r'```mermaid\s*([\s\S]*?)\s*```', gemini_reply, re.IGNORECASE)
        if mermaid_match:
            mermaid_code = mermaid_match.group(1).strip()

        return {
            "reply": gemini_reply,
            "mermaid_code": mermaid_code,
            "provider": "google_gemini",
            "model_used": configured_model
        }

    @classmethod
    def _intelligent_fallback_reasoning(cls, user_message: str, memory: Dict[str, Any]) -> str:
        msg_lower = user_message.lower()
        target_role = memory.get("target_role")
        field = memory.get("field_of_study")
        year = memory.get("academic_year")
        skills = memory.get("skills", [])

        # 1. Simple Educational / Technical Questions
        if "what is sql" in msg_lower:
            return "SQL (Structured Query Language) is the standard database language used to store, query, and manipulate structured data in relational databases like PostgreSQL and MySQL. For analytics and engineering, mastering SELECT queries, JOINs, aggregations, and window functions is essential."

        # 2. Simple Resume Request
        if "check my resume" in msg_lower or "analyze my resume" in msg_lower:
            resume_score = memory.get("resume_score")
            if resume_score is not None:
                return f"Your current native ATS resume score is {resume_score}/100. You can upload an updated PDF in the Resume Intelligence module to re-evaluate missing keywords and category breakdowns."
            else:
                return "I haven't analyzed your resume yet. Please upload your PDF or DOCX resume in the Resume Intelligence module so I can run a native ATS evaluation and keyword match."

        # 3. Target Role Acknowledgment & Onboarding Question
        if "data analyst" in msg_lower:
            if not field or field == "Not Set":
                return "Data Analyst is a solid career direction. Before I map out your preparation, I'd like to understand your starting point. What are you currently studying, and which year are you in?"
            elif not skills:
                return f"Great! Since you are studying {field} ({year or 'current year'}), which data tools or languages do you already know — for example Excel, SQL, Python, Power BI, or Tableau?"

        # 4. Role-Specific Roadmap Generation
        if target_role == "Data Analyst" or "data analyst" in msg_lower:
            if not skills:
                return "Data Analyst is your target role. Before I build your personalized roadmap, which technical skills or data tools are you currently comfortable with?"
            
            known_str = ", ".join(skills)
            return f"Since you already have a foundation in {known_str}, I will skip beginner material and focus your roadmap on statistics, business case studies, portfolio projects, and placement prep:\n\nPhase 1: Advanced SQL & Applied Statistics (5-7 days)\nPhase 2: Business Analytics & Case Studies (1 week)\nPhase 3: Portfolio Analytics Projects (2 weeks)\nPhase 4: ATS Resume Optimization & Job Matching\nPhase 5: Technical Data Analytics & Behavioral Mock Interviews"

        # General Onboarding Question
        if not target_role or target_role == "Not Set":
            return "Welcome to PlaceX. What career direction are you currently interested in?"

        return f"I have updated your target role to {target_role}. What technical skills or tools are you currently comfortable with?"

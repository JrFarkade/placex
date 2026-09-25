import json
import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.host_agent.services.context_builder import StudentContextBuilder

class HostAgentReviewEngine:
    """
    Host Agent module review engine. Provides grounded reasoning on ATS and Job Match results
    using the 4-Question Framework: WHAT, WHY, SO WHAT, NOW WHAT.
    """

    @classmethod
    def review_ats_health_check(cls, db: Session, user_id: int, ats_score: float, doc_type: str, section_scores: Dict[str, Any], suggestions: List[str]) -> Dict[str, Any]:
        context = StudentContextBuilder.build_student_context(db, user_id)
        student_name = context["student_name"]
        target_role = context["target_role"]

        api_key = settings.GEMINI_API_KEY
        configured_model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"

        prompt = f"""You are the PlaceX Host Agent, a high-level AI Career Mentor for {student_name} whose target role is {target_role}.
The student just ran a Mode A ATS Health Check on their resume.

EMPIRICAL RESULT DATA:
- ATS Score: {ats_score}/100
- Document Type: {doc_type}
- Section Scores: {json.dumps(section_scores)}
- ATS Suggestions: {json.dumps(suggestions)}

Respond in pure valid JSON format (without markdown code blocks) with exactly these 6 keys:
{{
  "what": "<2-3 sentences explaining what happened>",
  "why": "<2-3 sentences explaining why this score was achieved based on section scores and missing elements>",
  "so_what": "<2-3 sentences explaining what this score means for their placement eligibility and recruiter filtering>",
  "now_what": "<2-3 sentences giving clear next steps>",
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "navigate_actions": [
    {{"label": "<action label>", "target_tab": "<knowledge|coding|roadmap|interview|profile>", "sub_topic": "<optional subtopic>"}}
  ]
}}"""

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(model_name=configured_model)
                res = model.generate_content(prompt)
                if res and res.text:
                    cleaned_text = res.text.strip()
                    if cleaned_text.startswith("```json"):
                        cleaned_text = cleaned_text[7:]
                    if cleaned_text.endswith("```"):
                        cleaned_text = cleaned_text[:-3]
                    data = json.loads(cleaned_text.strip())
                    data["status"] = "success"
                    return data
            except Exception as e:
                print(f"[HostAgentReviewEngine Warning]: {e}")

        # Grounded Intelligent Fallback if LLM is offline or non-JSON
        section_summary = ", ".join([f"{k}: {v}%" for k, v in (section_scores or {}).items()]) or "General formatting evaluated"
        lowest_section = min(section_scores.items(), key=lambda x: x[1])[0] if section_scores else "Experience"

        return {
            "status": "success",
            "what": f"Your resume achieved a native ATS score of {ats_score}/100. Key section breakdown: {section_summary}.",
            "why": f"The main area impacting your score is {lowest_section}. " + (f"Key suggestion: {suggestions[0]}" if suggestions else "Ensure action verbs and quantifiable metrics are clearly visible."),
            "so_what": f"For {target_role} applications, automated ATS filters typically require 75+ pts to pass candidate screening to human recruiters without manual flags.",
            "now_what": f"Update {lowest_section} with bullet points emphasizing quantitative metrics (e.g. '% increase', 'ms latency reduced'), then practice relevant technical skills in PlaceX.",
            "recommendations": [
                f"Enhance bullet points in {lowest_section}",
                "Add 2-3 quantifiable achievements with numerical metrics",
                "Verify formatting matches standard single-column ATS templates",
                "Practice core domain concepts in Knowledge Base"
            ],
            "navigate_actions": [
                {"label": "Practice Technical MCQs", "target_tab": "knowledge"},
                {"label": "Solve Coding Challenges", "target_tab": "coding"},
                {"label": "Review Career Roadmap", "target_tab": "roadmap"}
            ]
        }

    @classmethod
    def review_jd_match(cls, db: Session, user_id: int, match_score: float, exact_keyword_score: float, semantic_score: float, matching_skills: List[str], missing_skills: List[str], target_jd: str) -> Dict[str, Any]:
        context = StudentContextBuilder.build_student_context(db, user_id)
        student_name = context["student_name"]
        target_role = context["target_role"]

        api_key = settings.GEMINI_API_KEY
        configured_model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"

        prompt = f"""You are the PlaceX Host Agent, a high-level AI Career Mentor for {student_name} whose target role is {target_role}.
The student just ran a Mode B Job Match analysis against a target Job Description.

EMPIRICAL RESULT DATA:
- Job Match Score: {match_score}/100
- Exact Keyword Match Score: {exact_keyword_score}%
- Semantic Similarity Score: {semantic_score}%
- Matching Skills Found: {json.dumps(matching_skills)}
- Missing Job Skills: {json.dumps(missing_skills)}

Respond in pure valid JSON format (without markdown code blocks) with exactly these 6 keys:
{{
  "what": "<2-3 sentences explaining what happened>",
  "why": "<2-3 sentences explaining why this match score was achieved>",
  "so_what": "<2-3 sentences explaining what this score means for candidacy>",
  "now_what": "<2-3 sentences giving clear action steps to bridge skill gaps>",
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "navigate_actions": [
    {{"label": "<action label>", "target_tab": "<knowledge|coding|roadmap|interview|profile>", "sub_topic": "<optional subtopic>"}}
  ]
}}"""

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(model_name=configured_model)
                res = model.generate_content(prompt)
                if res and res.text:
                    cleaned_text = res.text.strip()
                    if cleaned_text.startswith("```json"):
                        cleaned_text = cleaned_text[7:]
                    if cleaned_text.endswith("```"):
                        cleaned_text = cleaned_text[:-3]
                    data = json.loads(cleaned_text.strip())
                    data["status"] = "success"
                    return data
            except Exception as e:
                print(f"[HostAgentReviewEngine Warning]: {e}")

        # Grounded Intelligent Fallback
        top_missing = ", ".join(missing_skills[:3]) if missing_skills else "advanced domain frameworks"
        top_matching = ", ".join(matching_skills[:3]) if matching_skills else "general foundational skills"

        return {
            "status": "success",
            "what": f"Your resume scored {match_score}/100 for this target position, with {exact_keyword_score}% exact keyword match and {semantic_score}% semantic relevance.",
            "why": f"Your resume matched key requirements like {top_matching}, but is currently missing required job keywords: {top_missing}.",
            "so_what": f"Without {top_missing} explicitly reflected in your experience bullets, recruiter search filters may fail to index your profile for interview selection.",
            "now_what": f"Focus on bridging these missing skills by completing targeted practice modules on PlaceX and weaving relevant project context into your resume.",
            "recommendations": [
                f"Incorporate missing keywords ({top_missing}) into your project descriptions",
                "Practice relevant topic MCQs in Knowledge Base",
                "Complete a targeted coding problem for this domain",
                "Schedule a mock technical interview for this role"
            ],
            "navigate_actions": [
                {"label": f"Practice {missing_skills[0] if missing_skills else 'Skills'}", "target_tab": "knowledge"},
                {"label": "Solve Coding Problems", "target_tab": "coding"},
                {"label": "Start AI Mock Interview", "target_tab": "interview"}
            ]
        }

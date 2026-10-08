import re
import math
from typing import Dict, Any, List, Set
from app.resume_service.skills.skill_extractor import SkillExtractor

class MatcherEngine:
    """
    Robust Resume Matcher & Scoring Engine inspired by srbhr/Resume-Matcher.
    Supports Mode A (Resume Health Check) & Mode B (Job Match Analysis).
    """

    @classmethod
    def evaluate_mode_a_health_check(cls, parsed_resume: Dict[str, Any], text: str) -> Dict[str, Any]:
        """
        MODE A: Resume Health Check (Resume Only).
        Calculates Resume Quality Score without requiring a Job Description.
        """
        text_lower = text.lower()
        skills = parsed_resume["skills"]
        total_skills = parsed_resume["total_skills_detected"]
        p_info = parsed_resume["personal_info"]

        # 1. Section Structure Score (25%)
        sections_found = 0
        if parsed_resume.get("education"): sections_found += 1
        if parsed_resume.get("experience") or parsed_resume.get("internships"): sections_found += 1
        if parsed_resume.get("projects"): sections_found += 1
        if total_skills > 0: sections_found += 1
        if parsed_resume.get("certifications") or parsed_resume.get("achievements"): sections_found += 1
        
        score_structure = min(100.0, (sections_found / 4.0) * 100.0)

        # 2. Contact Info Score (20%)
        contact_pts = 0
        if p_info.get("email"): contact_pts += 1
        if p_info.get("phone"): contact_pts += 1
        if p_info.get("links"): contact_pts += 1
        score_contact = min(100.0, (contact_pts / 3.0) * 100.0)

        # 3. Technical Skills Score (25%)
        score_skills = min(100.0, (total_skills / 7.0) * 100.0)

        # 4. Formatting Readability & Length (15%)
        word_count = len(text.split())
        score_formatting = 95.0 if 200 <= word_count <= 900 else (75.0 if word_count <= 1400 else 50.0)

        # 5. Action Verbs Score (15%)
        action_count = len(skills.get("Action Verbs", []))
        score_action_verbs = min(100.0, (action_count / 4.0) * 100.0)

        # Final Weighted Resume Quality Score
        resume_quality_score = round(
            (score_structure * 0.25) +
            (score_contact * 0.20) +
            (score_skills * 0.25) +
            (score_formatting * 0.15) +
            (score_action_verbs * 0.15),
            1
        )

        suggestions = []
        if score_contact < 100.0:
            suggestions.append("Ensure your resume explicitly includes an email address, phone number, and LinkedIn/GitHub links.")
        if score_skills < 70.0:
            suggestions.append("List relevant technical skills, programming languages, databases, and developer tools in a dedicated Skills section.")
        if score_action_verbs < 70.0:
            suggestions.append("Use strong action verbs like 'Architected', 'Optimized', 'Engineered', or 'Spearheaded' to start bullet points.")
        if not parsed_resume.get("projects"):
            suggestions.append("Include 1–2 practical projects with tech stack details and measurable results.")

        return {
            "analysis_mode": "MODE_A_RESUME_HEALTH_CHECK",
            "resume_quality_score": resume_quality_score,
            "section_scores": {
                "Section Structure": round(score_structure, 1),
                "Contact Completeness": round(score_contact, 1),
                "Skills Coverage": round(score_skills, 1),
                "Formatting & Readability": round(score_formatting, 1),
                "Action Verbs": round(score_action_verbs, 1)
            },
            "suggestions": suggestions,
            "note": "Mode A evaluates overall structural health. Provide a Job Description to enable Mode B Job Match analysis."
        }

    @classmethod
    def evaluate_mode_b_job_match(cls, parsed_resume: Dict[str, Any], text: str, job_description: str) -> Dict[str, Any]:
        """
        MODE B: Job Match Analysis (Resume + Job Description).
        Calculates PlaceX Resume Match Score / ATS Compatibility Score.
        """
        health_check = cls.evaluate_mode_a_health_check(parsed_resume, text)
        
        jd_text_lower = job_description.lower()
        res_text_lower = text.lower()

        # 1. Extract Candidate & JD Tokens/Skills
        jd_skills_dict = SkillExtractor.extract_skills(job_description)
        jd_all_skills: Set[str] = set()
        for cat, skl_list in jd_skills_dict["skills_by_category"].items():
            if cat != "Action Verbs":
                jd_all_skills.update(s.lower() for s in skl_list)

        # Fallback keyword extraction from JD
        jd_words = set(re.findall(r'\b[a-zA-Z0-9\+\#\.]{3,}\b', jd_text_lower))
        stop_words = {"with", "that", "this", "from", "have", "will", "your", "must", "work", "team", "years", "experience", "role"}
        jd_keywords = (jd_all_skills | (jd_words - stop_words)) if jd_all_skills else (jd_words - stop_words)

        res_words = set(re.findall(r'\b[a-zA-Z0-9\+\#\.]{3,}\b', res_text_lower))

        # 2. Overlapping & Missing Keywords
        matching_keywords = sorted(list(jd_keywords.intersection(res_words)))
        missing_keywords = sorted(list(jd_keywords - res_words))

        # Filter missing keywords for meaningful tech terms
        display_missing = [k.capitalize() for k in missing_keywords if len(k) >= 3 and k not in stop_words][:8]
        display_matching = [k.capitalize() for k in matching_keywords if len(k) >= 3 and k not in stop_words][:10]

        # 3. Exact Match Score
        exact_match_score = min(100.0, (len(matching_keywords) / max(1, len(jd_keywords))) * 100.0) if jd_keywords else 75.0

        # 4. Semantic Similarity (Sentence Transformers / Vector Cosine Similarity)
        semantic_score = cls._compute_semantic_similarity(text, job_description)

        # PlaceX Resume Match Score (50% Exact Keyword Match + 50% Semantic Cosine Match)
        match_score = round((exact_match_score * 0.5) + (semantic_score * 0.5), 1)

        # Grounded suggestions (Never command candidate to fake experience)
        suggestions = []
        if display_missing:
            top_missing = ", ".join(display_missing[:3])
            suggestions.append(f"If you genuinely have experience with technologies like {top_missing}, consider adding them to your skills or project descriptions.")
        
        if len(matching_keywords) < 5:
            suggestions.append("Align your project bullet points with the key tools and methodologies highlighted in the job description.")

        return {
            "analysis_mode": "MODE_B_JOB_MATCH_ANALYSIS",
            "placex_match_score": match_score,
            "ats_compatibility_score": match_score,
            "resume_quality_score": health_check["resume_quality_score"],
            "semantic_similarity_score": round(semantic_score, 1),
            "exact_keyword_match_score": round(exact_match_score, 1),
            "matching_skills": display_matching,
            "missing_skills": display_missing,
            "suggestions": suggestions
        }

    @staticmethod
    def _compute_semantic_similarity(resume_text: str, jd_text: str) -> float:
        """
        Sentence Transformers vector similarity with TF-IDF fallback.
        """
        try:
            from sentence_transformers import SentenceTransformer, util
            model = SentenceTransformer("all-MiniLM-L6-v2")
            emb1 = model.encode(resume_text[:1000], convert_to_tensor=True)
            emb2 = model.encode(jd_text[:1000], convert_to_tensor=True)
            sim = util.cos_sim(emb1, emb2).item()
            return max(0.0, min(100.0, round(sim * 100.0, 1)))
        except Exception:
            # Jaccard word set similarity fallback
            set1 = set(re.findall(r'\w{4,}', resume_text.lower()))
            set2 = set(re.findall(r'\w{4,}', jd_text.lower()))
            if not set1 or not set2:
                return 65.0
            jaccard = len(set1.intersection(set2)) / len(set1.union(set2))
            return max(30.0, min(100.0, round(jaccard * 250.0, 1)))

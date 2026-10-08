import re
from typing import Dict, Any, List
from app.resume_service.skills.skill_extractor import SkillExtractor

class ATSEngine:
    """
    Configurable Native ATS Scoring Engine (0-100 score calculated across 13 weighted categories).
    Completely independent of parser and LLM layer.
    """

    DEFAULT_WEIGHTS = {
        "structure": 0.10,
        "contact_info": 0.10,
        "education": 0.10,
        "experience": 0.10,
        "projects": 0.10,
        "technical_skills": 0.10,
        "certifications": 0.05,
        "keyword_coverage": 0.10,
        "semantic_match": 0.10,
        "formatting": 0.05,
        "readability": 0.05,
        "action_verbs": 0.05,
        "grammar_placeholder": 0.00
    }

    @classmethod
    def evaluate_resume(cls, text: str, target_jd: str = "") -> Dict[str, Any]:
        text_lower = text.lower()
        skills_res = SkillExtractor.extract_skills(text)

        # 1. Structure & Section Headings
        sections = ["education", "experience", "projects", "skills", "certifications", "summary"]
        detected_sections = [s for s in sections if s in text_lower]
        score_structure = min(100.0, (len(detected_sections) / len(sections)) * 100.0)

        # 2. Contact Information
        has_email = 1 if re.search(r'[\w\.-]+@[\w\.-]+', text) else 0
        has_phone = 1 if re.search(r'\+?\d[\d\s-]{8,}', text) else 0
        has_linkedin = 1 if 'linkedin' in text_lower or 'github' in text_lower else 0
        score_contact = ((has_email + has_phone + has_linkedin) / 3.0) * 100.0

        # 3. Education Details
        has_degree = 1 if any(d in text_lower for d in ["b.tech", "b.e.", "b.s.", "m.tech", "bachelor", "master", "computer science"]) else 0
        has_year = 1 if re.search(r'20\d\d', text) else 0
        score_education = ((has_degree + has_year) / 2.0) * 100.0

        # 4. Experience & Chronology
        has_exp = 1 if "experience" in text_lower or "internship" in text_lower else 0
        score_experience = 85.0 if has_exp else 50.0

        # 5. Projects & Quantified Achievements
        has_metrics = len(re.findall(r'\b\d+%\b|\b\d+x\b|\$\d+|\b\d+k\b', text_lower))
        score_projects = min(100.0, 50.0 + (has_metrics * 15.0))

        # 6. Technical Skills Coverage
        total_skills = skills_res["total_skills_detected"]
        score_skills = min(100.0, (total_skills / 8.0) * 100.0)

        # 7. Certifications
        has_certs = 1 if "certification" in text_lower or "certified" in text_lower else 0
        score_certs = 90.0 if has_certs else 60.0

        # 8. Keyword Coverage vs JD
        score_keywords = 75.0
        missing_keywords = ["System Design", "Microservices", "Docker"]
        if target_jd:
            jd_words = set(re.findall(r'\w{4,}', target_jd.lower()))
            res_words = set(re.findall(r'\w{4,}', text_lower))
            overlap = jd_words.intersection(res_words)
            score_keywords = min(100.0, (len(overlap) / max(1, len(jd_words))) * 150.0)
            missing = list(jd_words - res_words)
            missing_keywords = [w.capitalize() for w in missing[:5]]

        # 9. Semantic Match
        score_semantic = min(100.0, score_keywords * 1.1)

        # 10. Formatting Spacing
        score_formatting = 85.0 if len(text) > 400 else 40.0

        # 11. Readability
        word_count = len(text.split())
        score_readability = 90.0 if 250 <= word_count <= 800 else 65.0

        # 12. Action Verbs
        action_count = skills_res["action_verb_count"]
        score_action_verbs = min(100.0, (action_count / 4.0) * 100.0)

        # 13. Grammar Placeholder
        score_grammar = 95.0

        category_scores = {
            "Structure": round(score_structure, 1),
            "Contact Info": round(score_contact, 1),
            "Education": round(score_education, 1),
            "Experience": round(score_experience, 1),
            "Projects & Metrics": round(score_projects, 1),
            "Technical Skills": round(score_skills, 1),
            "Certifications": round(score_certs, 1),
            "Keyword Density": round(score_keywords, 1),
            "Semantic Match": round(score_semantic, 1),
            "Formatting Spacing": round(score_formatting, 1),
            "Readability": round(score_readability, 1),
            "Action Verbs": round(score_action_verbs, 1),
            "Grammar": round(score_grammar, 1)
        }

        # Compute final weighted ATS score
        final_ats_score = sum(
            category_scores.get(cat_name, 70.0) * cls.DEFAULT_WEIGHTS[cat_key]
            for cat_key, cat_name in [
                ("structure", "Structure"),
                ("contact_info", "Contact Info"),
                ("education", "Education"),
                ("experience", "Experience"),
                ("projects", "Projects & Metrics"),
                ("technical_skills", "Technical Skills"),
                ("certifications", "Certifications"),
                ("keyword_coverage", "Keyword Density"),
                ("semantic_match", "Semantic Match"),
                ("formatting", "Formatting Spacing"),
                ("readability", "Readability"),
                ("action_verbs", "Action Verbs"),
                ("grammar_placeholder", "Grammar")
            ]
        )

        return {
            "ats_score": round(final_ats_score, 1),
            "category_scores": category_scores,
            "detected_skills": skills_res["skills_by_category"],
            "missing_keywords": missing_keywords,
            "suggestions": [
                "Quantify bullet points with metric percentages (e.g. 'Improved latency by 35%')",
                "Include standard Action Verbs like 'Architected', 'Optimized', or 'Spearheaded'",
                "Add missing tech keywords: " + ", ".join(missing_keywords[:3])
            ]
        }

import re
from typing import Dict, Any, List

class ResumeDetector:
    """
    Resume Validation & Confidence Engine (0-100 score).
    Analyzes document text before parser and ATS engine to reject non-resume PDFs (assignments, practicals, papers, invoices).
    """

    RESUME_HEADINGS = [
        "education", "experience", "work experience", "employment", "projects", 
        "technical skills", "skills", "certifications", "achievements", "summary", 
        "objective", "internship", "extracurricular"
    ]

    NON_RESUME_RED_FLAGS = [
        "lab report", "practical no", "practical #", "experiment no", "assignment", 
        "abstract", "references", "table of contents", "chapter 1", "chapter 2", 
        "invoice #", "bill to", "tax invoice", "receipt", "total amount", 
        "submitted by:", "submitted to:", "department of", "university exam", 
        "question paper", "syllabus", "user manual"
    ]

    @classmethod
    def detect_resume(cls, text: str) -> Dict[str, Any]:
        if not text or len(text.strip()) < 50:
            return {
                "is_resume": False,
                "confidence_score": 0.0,
                "classification": "Not A Resume",
                "reason": "Document text is empty or too short."
            }

        text_lower = text.lower()
        score = 0.0
        signals: List[str] = []
        red_flags: List[str] = []

        # 1. Contact Info Signals (Max 30 pts)
        has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
        has_phone = bool(re.search(r'\+?\d[\d\s-]{8,}', text))
        has_github_linkedin = 'linkedin' in text_lower or 'github' in text_lower or 'leetcode' in text_lower

        if has_email:
            score += 12.0
            signals.append("Email address found")
        if has_phone:
            score += 10.0
            signals.append("Phone number found")
        if has_github_linkedin:
            score += 8.0
            signals.append("Professional profile link (LinkedIn/GitHub) found")

        # 2. Typical Resume Headings (Max 40 pts)
        detected_headings = [h for h in cls.RESUME_HEADINGS if re.search(r'\b' + re.escape(h) + r'\b', text_lower)]
        heading_pts = min(40.0, len(detected_headings) * 8.0)
        score += heading_pts
        if detected_headings:
            signals.append(f"Resume headings detected ({len(detected_headings)}): {', '.join(detected_headings[:4])}")

        # 3. Resume Content Structure (Max 30 pts)
        has_skills = any(s in text_lower for s in ["python", "java", "c++", "sql", "react", "html", "javascript", "communication"])
        has_edu_degrees = any(d in text_lower for d in ["b.tech", "b.e.", "b.s.", "m.tech", "bachelor", "master", "gpa", "cgpa"])
        has_action_verbs = any(v in text_lower for v in ["developed", "built", "designed", "implemented", "managed", "created"])

        if has_skills:
            score += 10.0
        if has_edu_degrees:
            score += 10.0
        if has_action_verbs:
            score += 10.0

        # 4. Non-Resume Red Flag Penalties
        for flag in cls.NON_RESUME_RED_FLAGS:
            if flag in text_lower:
                red_flags.append(flag)
                score -= 25.0

        # Document Length Check (Resume typically 200–1200 words, practicals/textbooks 2000+ words)
        word_count = len(text.split())
        if word_count > 1500:
            score -= 20.0
            red_flags.append("Document length exceeds typical resume size (>1500 words)")

        final_score = max(0.0, min(100.0, round(score, 1)))

        # Classification Tiers
        if final_score >= 90.0:
            classification = "Definitely Resume"
            is_resume = True
        elif final_score >= 70.0:
            classification = "Probably Resume"
            is_resume = True
        elif final_score >= 50.0:
            classification = "Low Confidence Resume"
            is_resume = True
        else:
            classification = "Not A Resume"
            is_resume = False

        reason = "Valid professional resume structure detected." if is_resume else "Document contains academic, invoice, or non-resume content flags: " + (", ".join(red_flags) if red_flags else "Missing standard resume sections & contact details.")

        return {
            "is_resume": is_resume,
            "confidence_score": final_score,
            "classification": classification,
            "signals_found": signals,
            "red_flags_found": red_flags,
            "reason": reason
        }

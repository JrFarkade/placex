import re
from typing import Dict, Any, List

class DocumentType:
    RESUME = "RESUME"
    CV = "CV"
    UNKNOWN = "UNKNOWN"
    NON_RESUME = "NON_RESUME"
    EXTRACTION_FAILED = "EXTRACTION_FAILED"
    IMAGE_ONLY = "IMAGE_ONLY"

class DocumentClassifier:
    """
    Robust Document Type Classifier for PlaceX.
    Classifies files into RESUME, CV, UNKNOWN, NON_RESUME, EXTRACTION_FAILED, and IMAGE_ONLY states.
    Ensures ZERO false rejections for student/fresher resumes.
    """

    NON_RESUME_RED_FLAGS = [
        "lab report", "practical no", "practical #", "experiment no", "assignment",
        "abstract", "references", "table of contents", "chapter 1", "chapter 2",
        "invoice #", "bill to", "tax invoice", "receipt", "total amount",
        "submitted by:", "submitted to:", "department of", "university exam",
        "question paper", "syllabus", "user manual"
    ]

    RESUME_HEADINGS = [
        "education", "experience", "work experience", "employment", "projects",
        "technical skills", "skills", "certifications", "achievements", "summary",
        "objective", "internship", "internships", "extracurricular", "coursework", "profile"
    ]

    @classmethod
    def classify_document(cls, text: str, extraction_status: str = "SUCCESS") -> Dict[str, Any]:
        # Handle Extraction Failed State
        if extraction_status == "EXTRACTION_FAILED":
            return {
                "doc_type": DocumentType.EXTRACTION_FAILED,
                "confidence_score": 0.0,
                "is_valid_resume": False,
                "signals": [],
                "red_flags": ["PDF text extraction failed or file unreadable."],
                "message": "Your PDF could not be read. Please try exporting your resume again as a standard text-based PDF."
            }

        # Handle Image-Only Scanned State
        if extraction_status == "IMAGE_ONLY":
            return {
                "doc_type": DocumentType.IMAGE_ONLY,
                "confidence_score": 0.0,
                "is_valid_resume": False,
                "signals": [],
                "red_flags": ["PDF appears to contain images rather than selectable text."],
                "message": "This PDF appears to contain images rather than selectable text. Please upload a text-based PDF or enable OCR."
            }

        if not text or len(text.strip()) < 20:
            return {
                "doc_type": DocumentType.EXTRACTION_FAILED,
                "confidence_score": 0.0,
                "is_valid_resume": False,
                "signals": [],
                "red_flags": ["Extracted text length is zero."],
                "message": "Your PDF could not be read. Please try exporting your resume again as a standard PDF."
            }

        text_lower = text.lower()
        score = 0.0
        signals: List[str] = []
        red_flags: List[str] = []

        # 1. Contact Information Signals (Max 35 pts)
        has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
        has_phone = bool(re.search(r'\+?\d[\d\s-]{8,}', text))
        has_links = any(domain in text_lower for domain in ['linkedin', 'github', 'leetcode', 'portfolio', 'hackerrank'])

        if has_email:
            score += 15.0
            signals.append("Email address found")
        if has_phone:
            score += 10.0
            signals.append("Phone number found")
        if has_links:
            score += 10.0
            signals.append("Professional link found")

        # 2. Resume Headings (Max 40 pts)
        detected_headings = [h for h in cls.RESUME_HEADINGS if re.search(r'\b' + re.escape(h) + r'\b', text_lower)]
        score += min(40.0, len(detected_headings) * 10.0)
        if detected_headings:
            signals.append(f"Headings: {', '.join(detected_headings[:4])}")

        # 3. Content Structure (Max 25 pts)
        has_skills = any(s in text_lower for s in ["python", "java", "c++", "sql", "react", "html", "css", "javascript", "node", "git", "communication", "management"])
        has_degrees = any(d in text_lower for d in ["b.tech", "b.e.", "b.s.", "m.tech", "bachelor", "master", "gpa", "cgpa", "university", "college", "diploma", "degree", "school"])
        has_action_verbs = any(v in text_lower for v in ["developed", "built", "designed", "implemented", "managed", "created", "spearheaded", "engineered"])

        if has_skills:
            score += 10.0
        if has_degrees:
            score += 10.0
        if has_action_verbs:
            score += 5.0

        # 4. Red Flag Penalties for obvious non-resumes
        for flag in cls.NON_RESUME_RED_FLAGS:
            if flag in text_lower:
                red_flags.append(flag)
                score -= 30.0

        word_count = len(text.split())
        if word_count > 2500:
            score -= 20.0
            red_flags.append("Excessive word count (>2500 words)")

        final_score = max(0.0, min(100.0, round(score, 1)))

        # STUDENT / FRESHER RESUME PROTECTION RULE:
        # A student resume with Contact Info + Education + (Skills or Projects or Internships)
        # must be accepted even if Experience = 0!
        is_fresher_candidate = (has_email or has_phone) and (has_degrees or "education" in text_lower) and (has_skills or "projects" in text_lower or "internship" in text_lower)
        if is_fresher_candidate and not red_flags and final_score < 70.0:
            final_score = 80.0
            signals.append("Student/Fresher resume structure verified")

        # Classification Logic
        if red_flags and final_score < 40.0:
            doc_type = DocumentType.NON_RESUME
            is_valid = False
            message = "This document does not appear to be a resume."
        elif final_score >= 70.0:
            doc_type = DocumentType.CV if word_count > 900 else DocumentType.RESUME
            is_valid = True
            message = "Valid resume document recognized."
        elif final_score >= 45.0:
            doc_type = DocumentType.UNKNOWN
            is_valid = True
            message = "We couldn't confidently identify this document as a resume."
        else:
            doc_type = DocumentType.NON_RESUME
            is_valid = False
            message = "This document does not appear to be a resume."

        return {
            "doc_type": doc_type,
            "confidence_score": final_score,
            "is_valid_resume": is_valid,
            "signals": signals,
            "red_flags": red_flags,
            "message": message
        }

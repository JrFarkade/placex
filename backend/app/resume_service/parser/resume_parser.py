import re
from typing import Dict, Any, List
from app.resume_service.skills.skill_extractor import SkillExtractor

class StructuredResumeParser:
    """
    Parses plain text resume into normalized structured JSON representation.
    """

    @classmethod
    def parse_resume(cls, text: str) -> Dict[str, Any]:
        text_lines = [line.strip() for line in text.splitlines() if line.strip()]
        
        # 1. Extract Personal Info
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        phone_match = re.search(r'\+?\d[\d\s-]{8,}', text)
        links = re.findall(r'https?://[^\s]+|(?:linkedin\.com|github\.com|leetcode\.com)/[^\s]+', text, re.IGNORECASE)

        name = text_lines[0] if text_lines and not any(k in text_lines[0].lower() for k in ["resume", "curriculum", "page", "email"]) else "Candidate Name"

        personal_info = {
            "name": name,
            "email": email_match.group(0) if email_match else None,
            "phone": phone_match.group(0) if phone_match else None,
            "links": list(set(links))
        }

        # 2. Extract Skills
        skills_res = SkillExtractor.extract_skills(text)
        skills_by_category = skills_res["skills_by_category"]

        # 3. Detect Sections
        text_lower = text.lower()
        education_items = cls._extract_section_lines(text_lines, ["education", "academic", "qualification"])
        experience_items = cls._extract_section_lines(text_lines, ["experience", "employment", "work experience"])
        internship_items = cls._extract_section_lines(text_lines, ["internship", "internships", "training"])
        project_items = cls._extract_section_lines(text_lines, ["projects", "personal projects", "academic projects"])
        certification_items = cls._extract_section_lines(text_lines, ["certifications", "certificates", "courses"])

        return {
            "personal_info": personal_info,
            "summary": cls._extract_summary(text_lines),
            "education": education_items,
            "experience": experience_items,
            "internships": internship_items,
            "projects": project_items,
            "skills": skills_by_category,
            "total_skills_detected": skills_res["total_skills_detected"],
            "certifications": certification_items,
            "achievements": cls._extract_section_lines(text_lines, ["achievements", "honors", "awards"]),
            "languages": skills_by_category.get("Programming Languages", []),
            "links": list(set(links))
        }

    @staticmethod
    def _extract_summary(lines: List[str]) -> str:
        for i, line in enumerate(lines[:5]):
            if any(k in line.lower() for k in ["summary", "objective", "profile", "about"]):
                if i + 1 < len(lines):
                    return lines[i + 1]
        return ""

    @staticmethod
    def _extract_section_lines(lines: List[str], heading_keywords: List[str]) -> List[str]:
        extracted = []
        in_section = False
        for line in lines:
            line_lower = line.lower()
            if any(h in line_lower for h in heading_keywords) and len(line) < 40:
                in_section = True
                continue
            elif in_section:
                # End section when hitting next major heading
                if any(h in line_lower for h in ["education", "experience", "projects", "skills", "certifications", "achievements"]) and len(line) < 40:
                    break
                extracted.append(line)
                if len(extracted) >= 6:
                    break
        return extracted

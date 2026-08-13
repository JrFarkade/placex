import re
from typing import List, Dict, Set, Any

STANDARD_SKILLS_DB = {
    "Programming Languages": ["python", "java", "cpp", "c++", "c", "javascript", "typescript", "go", "rust", "kotlin", "sql", "html", "css"],
    "Frameworks & Libraries": ["react", "node.js", "express", "fastapi", "django", "flask", "spring boot", "next.js", "vue", "angular", "redux", "pandas", "numpy"],
    "Databases": ["mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle", "dynamodb"],
    "Cloud & DevOps": ["aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "ci/cd", "linux"],
    "Developer Tools & Concepts": ["rest api", "graphql", "system design", "data structures", "algorithms", "microservices", "oop"],
    "Action Verbs": ["developed", "built", "designed", "implemented", "optimized", "architected", "engineered", "scaled", "lead", "spearheaded", "improved", "created"]
}

class SkillExtractor:
    """
    Extracts and normalizes technical skills, action verbs, and keyword frequency from resume text.
    """

    @staticmethod
    def extract_skills(text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        extracted: Dict[str, List[str]] = {
            "Programming Languages": [],
            "Frameworks & Libraries": [],
            "Databases": [],
            "Cloud & DevOps": [],
            "Developer Tools & Concepts": [],
            "Action Verbs": []
        }

        for category, skills in STANDARD_SKILLS_DB.items():
            found = set()
            for skill in skills:
                # Word boundary search
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    found.add(skill.capitalize() if skill not in ["c++", "sql", "html", "css", "aws", "gcp", "oop"] else skill.upper())
            extracted[category] = list(found)

        total_skills_count = sum(len(v) for k, v in extracted.items() if k != "Action Verbs")
        action_verbs_count = len(extracted["Action Verbs"])

        return {
            "skills_by_category": extracted,
            "total_skills_detected": total_skills_count,
            "action_verbs_detected": extracted["Action Verbs"],
            "action_verb_count": action_verbs_count
        }

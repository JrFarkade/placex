from typing import Dict, Any, List

COMPANY_PROFILES = {
    "Google": {
        "preferred_skills": ["Graphs", "Dynamic Programming", "System Design", "Python/C++"],
        "interview_pattern": "1 Technical Screening + 4 Onsite Coding & System Design Rounds",
        "dsa_difficulty": "Hard",
        "behavioral_focus": "Googliness & Leadership Principles"
    },
    "Amazon": {
        "preferred_skills": ["Object Oriented Design", "Data Structures", "AWS Cloud", "Java"],
        "interview_pattern": "Online Assessment + 3 Technical Rounds + Bar Raiser",
        "dsa_difficulty": "Medium-Hard",
        "behavioral_focus": "16 Amazon Leadership Principles"
    },
    "Microsoft": {
        "preferred_skills": ["Arrays", "Trees", "System Architecture", "C#/C++"],
        "interview_pattern": "Codility Screening + 4 Technical & Managerial Rounds",
        "dsa_difficulty": "Medium",
        "behavioral_focus": "Growth Mindset & Problem Solving"
    }
}

class ReadinessEngine:
    """
    Calculates 0-100 Placement Readiness score categorized into 5 tiers.
    """

    @classmethod
    def calculate_readiness(cls, resume_score: float = None, coding_solved: int = 0, interview_score: float = 0.0) -> Dict[str, Any]:
        # Handle new user empty state
        if resume_score is None and coding_solved == 0 and interview_score == 0.0:
            return {
                "readiness_score": None,
                "readiness_level": "Not Calculated",
                "score_breakdown": {
                    "Resume Quality (25%)": "No resume uploaded",
                    "Coding Performance (35%)": "No submissions",
                    "Interview Performance (30%)": "No sessions",
                    "Consistency & Activity (10%)": "0 pts"
                }
            }

        # Weighted readiness metrics for real user actions
        res_val = resume_score if resume_score is not None else 0.0
        r_weight = (res_val / 100.0) * 25.0
        c_weight = min(35.0, (coding_solved / 30.0) * 35.0)
        i_weight = (interview_score / 100.0) * 30.0
        act_weight = 10.0 if (coding_solved > 0 or res_val > 0) else 0.0

        total_score = round(r_weight + c_weight + i_weight + act_weight, 1)

        # 5 Configurable Placement Tiers
        if total_score < 21.0:
            level = "Beginner"
        elif total_score < 41.0:
            level = "Foundation"
        elif total_score < 61.0:
            level = "Intermediate"
        elif total_score < 81.0:
            level = "Placement Ready"
        else:
            level = "Interview Ready"

        return {
            "readiness_score": total_score,
            "readiness_level": level,
            "score_breakdown": {
                "Resume Quality (25%)": f"{round(r_weight, 1)} pts",
                "Coding Performance (35%)": f"{round(c_weight, 1)} pts",
                "Interview Performance (30%)": f"{round(i_weight, 1)} pts",
                "Consistency & Activity (10%)": f"{round(act_weight, 1)} pts"
            }
        }

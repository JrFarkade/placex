import re
from typing import List, Dict, Any

class IntentCategory:
    RESUME = "Resume"
    CODING = "Coding"
    INTERVIEW = "Interview"
    ROADMAP = "Roadmap"
    QUIZ = "Quiz"
    DASHBOARD = "Dashboard"
    ANALYTICS = "Analytics"
    PROFILE = "Profile"
    SETTINGS = "Settings"
    CAREER_GUIDANCE = "General Career Guidance"
    MULTI_SERVICE = "Multi-Service Request"
    UNKNOWN = "Unknown Request"

class IntentEngine:
    """
    Classifies student requests into intent categories to determine service orchestration.
    """
    
    @staticmethod
    def classify_intent(message: str, active_feature: str = "dashboard") -> str:
        msg = message.lower()
        
        # Rule-based fast intent matching
        resume_keywords = ["resume", "ats", "cv", "bullet point", "job description match", "ats score"]
        coding_keywords = ["code", "coding", "leetcode", "dsa", "algorithm", "array", "python", "java", "c++", "problem", "solution", "complexity"]
        interview_keywords = ["interview", "mock interview", "hr interview", "viva", "speech", "answer", "behavioral question", "webcam"]
        roadmap_keywords = ["roadmap", "study plan", "schedule", "placement readiness", "readiness score", "what to learn", "daily tasks"]
        analytics_keywords = ["analytics", "progress", "stats", "chart", "performance"]
        
        scores = {
            IntentCategory.RESUME: sum(1 for k in resume_keywords if k in msg),
            IntentCategory.CODING: sum(1 for k in coding_keywords if k in msg),
            IntentCategory.INTERVIEW: sum(1 for k in interview_keywords if k in msg),
            IntentCategory.ROADMAP: sum(1 for k in roadmap_keywords if k in msg),
            IntentCategory.ANALYTICS: sum(1 for k in analytics_keywords if k in msg),
        }
        
        max_score = max(scores.values())
        matching_intents = [k for k, v in scores.items() if v == max_score and v > 0]
        
        if len(matching_intents) > 1:
            return IntentCategory.MULTI_SERVICE
        elif len(matching_intents) == 1:
            return matching_intents[0]
        
        # Contextual fallback based on current active UI tab
        if active_feature == "resume":
            return IntentCategory.RESUME
        elif active_feature == "coding":
            return IntentCategory.CODING
        elif active_feature == "interview":
            return IntentCategory.INTERVIEW
        elif active_feature == "roadmap":
            return IntentCategory.ROADMAP
        elif active_feature == "analytics":
            return IntentCategory.ANALYTICS
            
        return IntentCategory.CAREER_GUIDANCE

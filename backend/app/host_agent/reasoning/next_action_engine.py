"""
PlaceX Next Best Action Engine.
Evaluates holistic student state across Roadmap, Coding, Quiz, ATS, and Interviews
to synthesize dynamic priority and 1-click recommended next action.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.host_agent.state.state_manager import HostAgentStateManager
from app.host_agent.context.context_engine import get_official_roadmap_data


class NextActionEngine:
    """
    Synthesizes the Next Best Action for a student dynamically.
    Avoids rigid single-variable thresholds; balances roadmap progression and detected weaknesses.
    """

    @classmethod
    def evaluate_next_action(cls, db: Session, user_id: int) -> Dict[str, Any]:
        state = HostAgentStateManager.get_student_state(db, user_id)
        
        target_role = state["profile"]["target_role"]
        active_roadmap = state["active_roadmap"]
        branch = active_roadmap["branch"] or "Data Science"
        level = active_roadmap["level"] or "Beginner"
        curr_week = active_roadmap["current_week"]
        
        # Load official curriculum for current week
        official_data = get_official_roadmap_data()
        weeks = official_data.get(branch, {}).get(level, [])
        week_data = next((w for w in weeks if w.get("week") == curr_week), None)
        week_topic = week_data.get("topic") if week_data else f"Week {curr_week} Foundations"

        # Check for immediate detected weaknesses:
        weak_areas = state["weak_areas"]
        strengths = state["strengths"]
        
        # Check recent coding errors
        latest_coding = state["coding"]["latest_submission"]
        coding_failed_recently = latest_coding and latest_coding["status"].lower() not in ["accepted", "success"]

        # Check recent quiz failures
        latest_quiz = state["quiz"]["latest_attempt"]
        quiz_struggled = latest_quiz and latest_quiz["percentage"] < 65

        # Check resume status
        has_resume = state["resume"]["has_resume"]
        resume_score = state["resume"]["latest_score"]

        # Case 1: First-time student without target role
        if not target_role:
            return {
                "current_priority": "Career Role Selection & Onboarding",
                "reason": "You haven't established your target placement role yet. Selecting a target aligns your 24-week roadmap and skill metrics.",
                "recommended_action": "Set your target role in your student profile or tell Host Agent your career interest.",
                "relevant_module": "profile",
                "target_route": "profile",
                "cta_label": "Configure Career Goal"
            }

        # Case 2: Immediate coding debugging hurdle
        if coding_failed_recently:
            return {
                "current_priority": f"Resolve Coding Obstacle ({latest_coding['status']})",
                "reason": f"Your latest coding submission encountered '{latest_coding['status']}'. Debugging this solidifies your computational problem-solving.",
                "recommended_action": "Review the error analysis with Host Agent and submit the corrected implementation.",
                "relevant_module": "coding",
                "target_route": "coding",
                "cta_label": "Resume Sandbox Debugging"
            }

        # Case 3: Knowledge Base / Quiz weakness in fundamental prerequisite
        if quiz_struggled:
            weak_subtopic = next((w.replace("Needs Practice: ", "") for w in weak_areas if "Needs Practice" in w), latest_quiz["domain"])
            return {
                "current_priority": f"Strengthen Prerequisite: {weak_subtopic}",
                "reason": f"Your latest quiz attempt scored {latest_quiz['percentage']}%. Reviewing missed concepts now prevents compound difficulties later.",
                "recommended_action": f"Review explanations for missed questions in {weak_subtopic} and re-attempt the quiz.",
                "relevant_module": "knowledge",
                "target_route": "knowledge",
                "cta_label": "Review Quiz Gaps"
            }

        # Case 4: No ATS resume uploaded yet and student has some progress
        if not has_resume and (state["coding"]["unique_solved_count"] >= 1 or state["quiz"]["total_attempts"] >= 1):
            return {
                "current_priority": "ATS Resume Baseline Analysis",
                "reason": f"You are actively preparing for {target_role}. Running an initial ATS health check establishes your recruitment baseline.",
                "recommended_action": "Upload your current PDF or DOCX resume to check structure, formatting, and industry keyword match.",
                "relevant_module": "resume",
                "target_route": "resume",
                "cta_label": "Check ATS Score"
            }

        # Case 5: Active Roadmap Week progression (Default Primary Path)
        return {
            "current_priority": f"{branch} (Week {curr_week}): {week_topic}",
            "reason": f"In Week {curr_week} of your 24-week curriculum, focusing on '{week_topic}' builds the direct prerequisites for placement readiness.",
            "recommended_action": f"Complete this week's technical objectives: {week_topic}.",
            "relevant_module": "roadmap",
            "target_route": "roadmap",
            "cta_label": f"Open Week {curr_week} Roadmap"
        }

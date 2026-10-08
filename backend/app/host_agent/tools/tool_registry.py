"""
PlaceX Host Agent Tool Registry.
Defines strict schemas for all query and action tools available to the Host Agent.
Gemini requests tool invocations; the backend executes them securely.
"""

from typing import Dict, Any, List

HOST_AGENT_TOOLS: List[Dict[str, Any]] = [
    # Query Tools
    {
        "name": "get_student_profile",
        "description": "Retrieves the authenticated student's profile (degree, branch, university, target role, target company, cgpa, graduation year).",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_student_skills",
        "description": "Retrieves the authenticated student's confirmed skills and programming languages.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_current_roadmap",
        "description": "Retrieves the student's active roadmap branch, level, and current week number.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_roadmap_progress",
        "description": "Retrieves the student's completed and in-progress weeks across all roadmap branches.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_current_week",
        "description": "Retrieves details of the student's active week in their active roadmap.",
        "parameters": {
            "type": "object",
            "properties": {
                "branch": {"type": "string", "description": "Roadmap branch (e.g. 'Data Science', 'AI/ML Engineering')"},
                "level": {"type": "string", "description": "Level ('Beginner', 'Intermediate', 'Advanced')"}
            },
            "required": []
        }
    },
    {
        "name": "get_week_details",
        "description": "Retrieves the official PlaceX curriculum details for a specific week number in a branch and level.",
        "parameters": {
            "type": "object",
            "properties": {
                "branch": {"type": "string", "description": "Branch name"},
                "level": {"type": "string", "description": "Level name"},
                "week_num": {"type": "integer", "description": "Week number (1-24)"}
            },
            "required": ["branch", "level", "week_num"]
        }
    },
    {
        "name": "get_recent_quiz_results",
        "description": "Retrieves recent quiz attempts, scores, and wrong question details.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of recent quiz attempts to retrieve (1-10)"}
            },
            "required": []
        }
    },
    {
        "name": "get_quiz_attempt",
        "description": "Retrieves full question-by-question breakdown of a specific quiz attempt by attempt_id.",
        "parameters": {
            "type": "object",
            "properties": {
                "attempt_id": {"type": "string", "description": "UUID of the quiz attempt"}
            },
            "required": ["attempt_id"]
        }
    },
    {
        "name": "get_coding_history",
        "description": "Retrieves recent coding submissions, execution status, runtime, and solved problems.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of submissions to retrieve"}
            },
            "required": []
        }
    },
    {
        "name": "get_latest_coding_result",
        "description": "Retrieves the student's most recent coding execution result, status, and error details.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_latest_ats_result",
        "description": "Retrieves the student's latest real resume ATS score and section breakdown.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_latest_jd_match",
        "description": "Retrieves the latest Job Description match score, matching skills, and missing skills.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_interview_results",
        "description": "Retrieves completed AI Mock Interview sessions, overall scores, and speech/vision feedback.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of sessions to retrieve"}
            },
            "required": []
        }
    },
    {
        "name": "get_knowledge_progress",
        "description": "Retrieves mastered vs learning question counts in the Knowledge Base.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_recent_activity",
        "description": "Retrieves the student's chronological stream of recent PlaceX application events.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Number of recent events (default 8)"}
            },
            "required": []
        }
    },

    # Action Tools
    {
        "name": "update_learning_state",
        "description": "Updates the student's current learning focus area and priority level in Host Agent state.",
        "parameters": {
            "type": "object",
            "properties": {
                "focus_area": {"type": "string", "description": "Current learning focus (e.g. 'Python Functions & Scope')"},
                "priority_level": {"type": "string", "description": "Priority level ('high', 'medium', 'low')"}
            },
            "required": ["focus_area"]
        }
    },
    {
        "name": "mark_topic_as_relevant",
        "description": "Flags a specific skill or topic as highly relevant for the student's target role.",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Topic name"},
                "target_module": {"type": "string", "description": "Module where this topic should be practiced"}
            },
            "required": ["topic", "target_module"]
        }
    },
    {
        "name": "create_practice_task",
        "description": "Creates an actionable task in the student's Host Agent task list.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Clear concise task title"},
                "description": {"type": "string", "description": "Actionable task instructions grounded in real PlaceX content"},
                "module": {"type": "string", "description": "Relevant PlaceX module ('roadmap', 'coding', 'quiz', 'resume', 'interview')"},
                "priority": {"type": "string", "description": "'high', 'medium', or 'low'"},
                "target_route": {"type": "string", "description": "UI route identifier ('coding', 'roadmap', 'knowledge', 'resume', 'interview')"}
            },
            "required": ["title", "description", "module"]
        }
    },
    {
        "name": "recommend_roadmap_week",
        "description": "Recommends focusing on a specific roadmap week with clear objective rationale.",
        "parameters": {
            "type": "object",
            "properties": {
                "branch": {"type": "string", "description": "Career branch"},
                "level": {"type": "string", "description": "Level"},
                "week_num": {"type": "integer", "description": "Week number (1-24)"},
                "reason": {"type": "string", "description": "Why this week is the next best action"}
            },
            "required": ["branch", "level", "week_num", "reason"]
        }
    },
    {
        "name": "recommend_quiz",
        "description": "Recommends taking a quiz in a specific domain based on recent gaps or roadmap progression.",
        "parameters": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Quiz domain (e.g. 'SoftwareEngineering', 'DataScience', 'AIML')"},
                "reason": {"type": "string", "description": "Why this quiz is recommended"}
            },
            "required": ["domain", "reason"]
        }
    },
    {
        "name": "recommend_coding_problem",
        "description": "Recommends solving a specific coding problem or category connected to student gaps.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Coding category (e.g. 'Python', 'Arrays', 'SQL')"},
                "question_id": {"type": "integer", "description": "Specific question ID if known"},
                "reason": {"type": "string", "description": "Why this problem is recommended"}
            },
            "required": ["category", "reason"]
        }
    },
    {
        "name": "recommend_interview_practice",
        "description": "Recommends scheduling a mock interview to practice specific technical or behavioral domains.",
        "parameters": {
            "type": "object",
            "properties": {
                "interview_type": {"type": "string", "description": "'Technical', 'HR', or 'Viva'"},
                "reason": {"type": "string", "description": "Why this interview practice is recommended"}
            },
            "required": ["interview_type", "reason"]
        }
    },
    {
        "name": "open_placex_module",
        "description": "Instructs the PlaceX UI to navigate the student to a specific module.",
        "parameters": {
            "type": "object",
            "properties": {
                "module_name": {"type": "string", "description": "'dashboard', 'roadmap', 'coding', 'knowledge', 'resume', 'interview', 'profile'"}
            },
            "required": ["module_name"]
        }
    },
    {
        "name": "show_roadmap_week",
        "description": "Directs the student to view and focus on an exact roadmap week in the UI.",
        "parameters": {
            "type": "object",
            "properties": {
                "branch": {"type": "string", "description": "Roadmap branch"},
                "level": {"type": "string", "description": "Roadmap level"},
                "week_num": {"type": "integer", "description": "Week number (1-24)"}
            },
            "required": ["branch", "level", "week_num"]
        }
    },
    {
        "name": "explain_result",
        "description": "Generates a structured 4-Question explanation: WHAT happened, WHY it happened, SO WHAT it means for placement, NOW WHAT to do next.",
        "parameters": {
            "type": "object",
            "properties": {
                "what": {"type": "string", "description": "Objective statement of what happened"},
                "why": {"type": "string", "description": "Root cause based on real module metrics"},
                "so_what": {"type": "string", "description": "Impact on placement readiness and recruiter screening"},
                "now_what": {"type": "string", "description": "Actionable next step in PlaceX"}
            },
            "required": ["what", "why", "so_what", "now_what"]
        }
    }
]

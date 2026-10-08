"""
Standard PlaceX Event Types observed by the Host Agent.
All events represent authentic interactions inside the PlaceX application.
"""

from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class PlaceXEventType(str, Enum):
    # Student Account / Profile
    STUDENT_LOGGED_IN = "student.logged_in"
    STUDENT_PROFILE_UPDATED = "student.profile_updated"
    
    # Career Roadmap
    ROADMAP_OPENED = "roadmap.opened"
    ROADMAP_CAREER_SELECTED = "roadmap.career_selected"
    ROADMAP_LEVEL_SELECTED = "roadmap.level_selected"
    ROADMAP_WEEK_OPENED = "roadmap.week_opened"
    ROADMAP_WEEK_STARTED = "roadmap.week_started"
    ROADMAP_WEEK_COMPLETED = "roadmap.week_completed"

    # Quiz / Knowledge Base
    QUIZ_OPENED = "quiz.opened"
    QUIZ_STARTED = "quiz.started"
    QUIZ_QUESTION_ANSWERED = "quiz.question_answered"
    QUIZ_COMPLETED = "quiz.completed"
    QUIZ_ANSWER_REVIEWED = "quiz.answer_reviewed"

    # Coding Sandbox
    CODING_OPENED = "coding.opened"
    CODING_CODE_EXECUTED = "coding.code_executed"
    CODING_EXECUTION_FAILED = "coding.execution_failed"
    CODING_EXECUTION_SUCCEEDED = "coding.execution_succeeded"
    CODING_AI_FIX_REQUESTED = "coding.ai_fix_requested"
    CODING_AI_FIX_APPLIED = "coding.ai_fix_applied"

    # ATS Resume Intelligence
    ATS_RESUME_UPLOADED = "ats.resume_uploaded"
    ATS_ANALYSIS_COMPLETED = "ats.analysis_completed"
    ATS_JD_MATCH_COMPLETED = "ats.jd_match_completed"

    # AI Mock Interview
    INTERVIEW_OPENED = "interview.opened"
    INTERVIEW_STARTED = "interview.started"
    INTERVIEW_COMPLETED = "interview.completed"

    # Knowledge Base Exploration
    KNOWLEDGE_BASE_OPENED = "knowledge_base.opened"
    KNOWLEDGE_TOPIC_OPENED = "knowledge_topic_opened"

    # Dashboard
    DASHBOARD_OPENED = "dashboard.opened"


class PlaceXEventPayload(BaseModel):
    event_type: str
    module: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None

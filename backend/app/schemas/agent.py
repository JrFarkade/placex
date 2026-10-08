from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str
    active_module: Optional[str] = "dashboard"
    active_feature: Optional[str] = None # Backwards compatibility alias
    conversation_id: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class NextActionSchema(BaseModel):
    current_priority: str
    reason: str
    recommended_action: str
    relevant_module: str
    target_route: str
    cta_label: str

class ChatResponse(BaseModel):
    status: str = "success"
    reply: str
    current_context: str
    conversation_id: Optional[str] = None
    next_action: Optional[Dict[str, Any]] = None
    strengths: List[str] = []
    weak_areas: List[str] = []
    suggested_tasks: List[Dict[str, Any]] = []
    processing_time: float

class EventRequest(BaseModel):
    event_type: str
    module: Optional[str] = None
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)

class TaskCreateRequest(BaseModel):
    title: str
    description: str
    module: str = "coding"
    priority: str = "high"
    target_route: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    status: str # "pending", "in_progress", "completed", "dismissed"

class ToolExecutionRequest(BaseModel):
    tool_name: str
    arguments: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ATSReviewRequest(BaseModel):
    ats_score: float
    doc_type: Optional[str] = "TEXT_RESUME"
    section_scores: Optional[Dict[str, Any]] = Field(default_factory=dict)
    suggestions: Optional[List[str]] = Field(default_factory=list)

class JDMatchReviewRequest(BaseModel):
    match_score: float
    exact_keyword_match_score: Optional[float] = 0.0
    semantic_similarity_score: Optional[float] = 0.0
    matching_skills: Optional[List[str]] = Field(default_factory=list)
    missing_skills: Optional[List[str]] = Field(default_factory=list)
    job_description: Optional[str] = ""

class HostAgentReviewResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None
    why_score: Optional[str] = None
    what_is_working: Optional[str] = None
    what_could_improve: Optional[str] = None
    what_to_change_first: Optional[str] = None
    what_already_matches: Optional[str] = None
    what_is_missing: Optional[str] = None
    what_can_be_improved: Optional[str] = None
    what_to_prioritize: Optional[str] = None
    what: Optional[str] = None
    why: Optional[str] = None
    so_what: Optional[str] = None
    now_what: Optional[str] = None
    recommendations: List[str] = []
    navigate_actions: List[Dict[str, Any]] = []

class ResumeChatRequest(BaseModel):
    message: str
    analysis_mode: Optional[str] = "MODE_A_RESUME_HEALTH_CHECK"
    ats_score: Optional[float] = 0.0
    section_scores: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None
    matching_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    job_description: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class QuizExplainRequest(BaseModel):
    question_id: int
    selected_option_index: int

class CodingErrorExplainRequest(BaseModel):
    source_code: str
    error_message: Optional[str] = ""
    stdin_input: Optional[str] = ""
    language: Optional[str] = "python"
    user_question: Optional[str] = None
    stdout: Optional[str] = ""
    error_line: Optional[int] = None
    error_type: Optional[str] = None

class RoadmapWeekExplainRequest(BaseModel):
    branch: str
    level: str
    week_number: int
    week_title: str
    prerequisites: Optional[str] = None
    completion_criteria: Optional[str] = None
    user_question: Optional[str] = None

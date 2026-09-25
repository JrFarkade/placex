from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    active_feature: Optional[str] = "dashboard"

class ChatResponse(BaseModel):
    status: str = "success"
    intent: str
    reply: str
    services_executed: List[str]
    structured_data: Dict[str, Any] = {}
    recommendations: List[str] = []
    processing_time: float

class ATSReviewRequest(BaseModel):
    ats_score: float
    doc_type: Optional[str] = "TEXT_RESUME"
    section_scores: Optional[Dict[str, Any]] = {}
    suggestions: Optional[List[str]] = []

class JDMatchReviewRequest(BaseModel):
    match_score: float
    exact_keyword_match_score: Optional[float] = 0.0
    semantic_similarity_score: Optional[float] = 0.0
    matching_skills: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []
    job_description: Optional[str] = ""

class HostAgentReviewResponse(BaseModel):
    status: str = "success"
    what: str
    why: str
    so_what: str
    now_what: str
    recommendations: List[str] = []
    navigate_actions: List[Dict[str, Any]] = []

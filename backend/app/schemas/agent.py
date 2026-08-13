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

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.agent import ChatRequest, ChatResponse
from app.host_agent.services.orchestrator import HostAgentOrchestrator
from app.host_agent.memory.memory_manager import MemoryManager
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/agent", tags=["Host Agent"])

@router.post("/chat", response_model=ChatResponse)
def chat_with_host_agent(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return HostAgentOrchestrator.process_request(
        db=db,
        user_id=current_user.id,
        message=req.message,
        active_feature=req.active_feature or "dashboard"
    )

@router.get("/memory")
def get_host_agent_memory(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return MemoryManager.get_memory(db, user_id=current_user.id)

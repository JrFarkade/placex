from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.agent import router as agent_router
from app.api.v1.resume import router as resume_router
from app.api.v1.coding import router as coding_router
from app.api.v1.interview import router as interview_router
from app.api.v1.roadmap import router as roadmap_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(agent_router)
api_router.include_router(resume_router)
api_router.include_router(coding_router)
api_router.include_router(interview_router)
api_router.include_router(roadmap_router)

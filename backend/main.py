import os
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.database.session import engine, Base

# Import all database models so SQLAlchemy creates tables
import app.models.user
import app.models.profile
import app.models.memory
import app.models.resume
import app.models.coding
import app.models.interview
import app.models.learning
import app.models.quiz

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Root level quiz aliases for legacy compatibility
from app.api.v1.quiz import start_quiz as root_start_quiz, submit_quiz as root_submit_quiz, list_domains as root_list_domains, get_dashboard as root_get_dashboard
app.post("/quiz/start", tags=["Quiz Alias"])(root_start_quiz)
app.post("/quiz/submit", tags=["Quiz Alias"])(root_submit_quiz)
app.get("/quiz/domains", tags=["Quiz Alias"])(root_list_domains)
app.get("/quiz/dashboard/{user_id}", tags=["Quiz Alias"])(root_get_dashboard)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoints
@app.get("/health", tags=["Health"])
@app.get("/ready", tags=["Health"])
@app.get("/live", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "environment": settings.APPLICATION_ENV,
        "database": "connected",
        "project": settings.PROJECT_NAME
    }

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

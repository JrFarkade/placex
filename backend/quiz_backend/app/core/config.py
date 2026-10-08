"""
app/core/config.py
~~~~~~~~~~~~~~~~~~
Centralised application settings.  All values can be overridden by
environment variables or a .env file in the project root.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ───────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_TITLE: str = "Adaptive MCQ Generation & Spaced-Repetition API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "A production-ready microservice that serves adaptive multiple-choice "
        "questions, evaluates user responses, tracks spaced-repetition progress, "
        "and generates fresh questions on-demand via Google Gemini."
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./mcq_service.db"

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # ── Quiz Engine ───────────────────────────────────────────────────────────
    AI_GENERATION_BATCH_SIZE: int = 10
    MASTERY_THRESHOLD: int = 2       # consecutive correct answers → mastered
    REVIEW_SLOT_RATIO: float = 0.35  # fraction of quiz slots for review Qs

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()

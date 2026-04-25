"""
HogAI — core/config.py
Application settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API
    groq_api_key: str

    # App
    app_name: str = "HogAI"
    app_version: str = "1.0.0"
    debug: bool = False

    # Groq
    default_model: str = "llama-3.3-70b-versatile"
    max_tokens: int = 2048
    system_prompt: str = (
        "You are HogAI, a helpful and intelligent AI assistant. "
        "Format code with triple backtick markdown. "
        "Be concise, clear, and friendly."
    )

    # Rate limiting (requests per minute per IP)
    rate_limit_rpm: int = 20

    # CORS
    allowed_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

"""
HogAI — routers/health.py
Health & status endpoints.
"""

import logging
from fastapi import APIRouter
from models.schemas import HealthResponse
from services.groq_service import check_connection
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Health"])


@router.get("/", summary="Root")
def root():
    return {"message": f"{settings.app_name} API v{settings.app_version} 🐷"}


@router.get("/health", response_model=HealthResponse, summary="Health check")
async def health():
    connected = await check_connection()
    logger.info("Health check | groq_connected=%s", connected)
    return HealthResponse(
        status="healthy" if connected else "degraded",
        version=settings.app_version,
        model=settings.default_model,
        groq_connected=connected,
    )

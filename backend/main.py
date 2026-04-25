"""
HogAI — main.py
FastAPI application entry point.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from middleware.rate_limit import RateLimitMiddleware
from routers import health, chat

# ── Logging ──────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Settings ──────────────────────────────────
settings = get_settings()

# ── App ───────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="HogAI — AI Chat Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

# ── Routers ───────────────────────────────────
app.include_router(health.router)
app.include_router(chat.router)

# ── Startup ───────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info("🐷 %s v%s starting up...", settings.app_name, settings.app_version)
    logger.info("Model: %s | Rate limit: %d rpm", settings.default_model, settings.rate_limit_rpm)

"""
HogAI — middleware/rate_limit.py
Simple in-memory rate limiter: max N requests per minute per IP.
"""

import time
import logging
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# { ip: [timestamp, timestamp, ...] }
_request_log: dict[str, list[float]] = defaultdict(list)

WINDOW = 60.0  # seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only rate-limit the chat endpoints
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - WINDOW

        # Drop timestamps outside the window
        _request_log[ip] = [t for t in _request_log[ip] if t > window_start]

        if len(_request_log[ip]) >= settings.rate_limit_rpm:
            logger.warning("Rate limit hit | ip=%s | count=%d", ip, len(_request_log[ip]))
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "detail": f"Max {settings.rate_limit_rpm} requests per minute.",
                    "code": 429,
                },
            )

        _request_log[ip].append(now)
        return await call_next(request)

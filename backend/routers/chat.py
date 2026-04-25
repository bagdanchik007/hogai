"""
HogAI — routers/chat.py
Chat endpoints: single response + SSE streaming.
"""

import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest, ChatResponse
from services.groq_service import chat_complete, stream_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    summary="Single chat completion",
)
async def chat(req: ChatRequest):
    """Returns a full response in one go."""
    try:
        return await chat_complete(req)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/chat")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post(
    "/stream",
    summary="Streaming chat completion (SSE)",
)
async def chat_stream(req: ChatRequest):
    """
    Returns a Server-Sent Events stream.
    Each event: data: {"delta": "..."} 
    Final event: data: {"done": true, "usage": {...}}
    """
    return StreamingResponse(
        stream_chat(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )

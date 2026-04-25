"""
HogAI — services/groq_service.py
All Groq API interaction logic — single responsibility.
"""

import json
import logging
from groq import Groq, APIConnectionError, AuthenticationError, RateLimitError
from core.config import get_settings
from models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
settings = get_settings()

# Single shared client instance
_client: Groq | None = None


def get_client() -> Groq:
    """Return or create the shared Groq client."""
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _build_messages(req: ChatRequest) -> list[dict]:
    """Prepend system prompt and convert to Groq format."""
    system = req.system or settings.system_prompt
    result = [{"role": "system", "content": system}]
    result += [{"role": m.role, "content": m.content} for m in req.messages]
    return result


async def chat_complete(req: ChatRequest) -> ChatResponse:
    """Non-streaming completion."""
    client = get_client()
    model = req.model or settings.default_model
    max_tokens = req.max_tokens or settings.max_tokens

    logger.info("chat_complete | model=%s | messages=%d", model, len(req.messages))

    try:
        response = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=_build_messages(req),
        )
        return ChatResponse(
            content=response.choices[0].message.content,
            model=response.model,
            usage={
                "input_tokens":  response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            },
        )
    except AuthenticationError:
        raise ValueError("Invalid GROQ_API_KEY")
    except RateLimitError:
        raise RuntimeError("Groq rate limit reached. Try again later.")
    except APIConnectionError as e:
        logger.error("Groq connection error: %s", e)
        raise RuntimeError("Could not reach Groq API.")


def stream_chat(req: ChatRequest):
    """
    Generator that yields SSE-formatted strings.
    Yields:  data: {"delta": "..."}\n\n
    Final:   data: {"done": true, "usage": {...}}\n\n
    Error:   data: {"error": "..."}\n\n
    """
    client = get_client()
    model = req.model or settings.default_model
    max_tokens = req.max_tokens or settings.max_tokens

    logger.info("stream_chat | model=%s | messages=%d", model, len(req.messages))

    try:
        stream = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=_build_messages(req),
            stream=True,
        )

        input_tokens  = 0
        output_tokens = 0

        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {json.dumps({'delta': delta})}\n\n"
            if chunk.usage:
                input_tokens  = chunk.usage.prompt_tokens
                output_tokens = chunk.usage.completion_tokens

        yield f"data: {json.dumps({'done': True, 'usage': {'input_tokens': input_tokens, 'output_tokens': output_tokens}})}\n\n"

    except AuthenticationError:
        yield f"data: {json.dumps({'error': 'Invalid GROQ_API_KEY'})}\n\n"
    except RateLimitError:
        yield f"data: {json.dumps({'error': 'Rate limit reached. Try again later.'})}\n\n"
    except Exception as e:
        logger.error("stream_chat error: %s", e)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def check_connection() -> bool:
    """Ping Groq with a tiny request to verify the key works."""
    try:
        client = get_client()
        client.chat.completions.create(
            model=settings.default_model,
            max_tokens=1,
            messages=[{"role": "user", "content": "hi"}],
        )
        return True
    except Exception:
        return False

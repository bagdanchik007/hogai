from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq
import os
import json

# ── App ───────────────────────────────────────
app = FastAPI(title="HogAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq client ───────────────────────────────
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

DEFAULT_MODEL = "llama-3.3-70b-versatile"


# ── Schemas ───────────────────────────────────
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = DEFAULT_MODEL
    max_tokens: Optional[int] = 2048
    system: Optional[str] = (
        "You are HogAI, a helpful and smart AI assistant. "
        "Format code with triple backtick markdown. "
        "Be concise, clear, and friendly."
    )


# ── Routes ────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "HogAI API is running 🐷"}


@app.get("/health")
def health():
    return {"status": "healthy", "model": DEFAULT_MODEL}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Non-streaming — returns full response at once"""
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        full_messages = [{"role": "system", "content": req.system}] + messages

        response = client.chat.completions.create(
            model=req.model,
            max_tokens=req.max_tokens,
            messages=full_messages,
        )

        return {
            "content": response.choices[0].message.content,
            "model":   response.model,
            "usage": {
                "input_tokens":  response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            },
        }

    except Exception as e:
        err = str(e)
        if "invalid_api_key" in err or "401" in err:
            raise HTTPException(status_code=401, detail="Invalid GROQ_API_KEY")
        if "rate_limit" in err or "429" in err:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        raise HTTPException(status_code=500, detail=err)


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming — returns Server-Sent Events (SSE)"""
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    full_messages = [{"role": "system", "content": req.system}] + messages

    def generate():
        try:
            stream = client.chat.completions.create(
                model=req.model,
                max_tokens=req.max_tokens,
                messages=full_messages,
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

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import anthropic
import os
import json

app = FastAPI(title="DeepChat API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hier kann man spezifische Domains angeben, z.B. ["https://myfrontend.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "claude-sonnet-4-20250514"
    max_tokens: Optional[int] = 2048
    system: Optional[str] = "You are a helpful AI assistant. Be concise, clear, and friendly."


@app.get("/")
def root():
    return {"status": "ok", "message": "DeepChat API is running 🚀"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Non-streaming chat endpoint"""
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]

        response = client.messages.create(
            model=req.model,
            max_tokens=req.max_tokens,
            system=req.system,
            messages=messages,
        )

        return {
            "content": response.content[0].text,
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        }
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming chat endpoint — returns Server-Sent Events"""
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def generate():
        try:
            with client.messages.stream(
                model=req.model,
                max_tokens=req.max_tokens,
                system=req.system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    data = json.dumps({"delta": text})
                    yield f"data: {data}\n\n"

                # Send Schlussmeldung mit Token-Usage
                final = stream.get_final_message()
                done_data = json.dumps({
                    "done": True,
                    "usage": {
                        "input_tokens": final.usage.input_tokens,
                        "output_tokens": final.usage.output_tokens,
                    }
                })
                yield f"data: {done_data}\n\n"

        except anthropic.AuthenticationError:
            yield f"data: {json.dumps({'error': 'Invalid API key'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

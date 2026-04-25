"""
HogAI — models/schemas.py
All Pydantic request/response models.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1, max_length=32_000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, v: str) -> str:
        return v.strip()


class ChatRequest(BaseModel):
    messages: list[Message] = Field(..., min_length=1, max_length=100)
    model: Optional[str] = None          # Falls back to settings default
    max_tokens: Optional[int] = Field(None, ge=1, le=8192)
    system: Optional[str] = Field(None, max_length=4000)

    @field_validator("messages")
    @classmethod
    def last_message_must_be_user(cls, v: list[Message]) -> list[Message]:
        if v and v[-1].role != "user":
            raise ValueError("Last message must be from the user.")
        return v


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, int]


class HealthResponse(BaseModel):
    status: str
    version: str
    model: str
    groq_connected: bool


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: int

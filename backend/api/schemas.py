from typing import Any, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    sessionId: str
    text: str


class ToolCallLogEntry(BaseModel):
    id: str
    name: str
    status: str
    durationMs: int
    input: Optional[dict[str, Any]] = None
    output: Optional[Any] = None
    error: Optional[str] = None


class HandoffContext(BaseModel):
    reason: str
    summary: str


class ChatResponse(BaseModel):
    reply: str
    toolCalls: list[ToolCallLogEntry]
    handoff: Optional[HandoffContext] = None

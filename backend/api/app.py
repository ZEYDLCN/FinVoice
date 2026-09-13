"""Agent Orchestrator API (Faz 4).

POST /v1/chat is the real-agent counterpart of the frontend's
/api/agent/message (Faz 2, scripted demoAgent.ts): same request/response
shape, but the reasoning is done by a real LLM through a LangGraph
tool-calling loop instead of a hand-written state machine.
"""
from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, FastAPI
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from backend.agents.graph import build_graph
from backend.api.schemas import ChatRequest, ChatResponse, HandoffContext, ToolCallLogEntry
from backend.llm.factory import get_chat_model

app = FastAPI(
    title="FinVoice Ops — Agent Orchestrator",
    version="0.1.0",
    description="LangGraph tool-calling agent over the mock-enterprise API (Faz 4).",
)


@lru_cache
def get_graph():
    return build_graph(get_chat_model())


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, graph=Depends(get_graph)):
    tool_log: list[dict] = []
    handoff_box: dict = {}

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=req.text)]},
        config={
            "configurable": {
                "thread_id": req.sessionId,
                "tool_log": tool_log,
                "handoff_box": handoff_box,
            }
        },
    )

    handoff: HandoffContext | None = None
    if handoff_box.get("reason") is not None:
        reason = handoff_box["reason"] or "Belirtilmedi"
        reply = f"Sizi bir müşteri temsilcisine aktarıyorum. Neden: {reason}"
        handoff = HandoffContext(reason=reason, summary=_build_summary(result["messages"], reason))
    else:
        last = result["messages"][-1]
        reply = last.content if isinstance(last, AIMessage) else str(last.content)

    return ChatResponse(
        reply=reply,
        toolCalls=[ToolCallLogEntry(**entry) for entry in tool_log],
        handoff=handoff,
    )


def _build_summary(messages: list[BaseMessage], reason: str) -> str:
    lines = [f"Handoff nedeni: {reason}", "", "Son mesajlar:"]
    for m in messages[-6:]:
        content = m.content if isinstance(m.content, str) else str(m.content)
        if content:
            lines.append(f"{m.type}: {content}")
    return "\n".join(lines)

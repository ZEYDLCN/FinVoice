"""Agent Orchestrator API (Faz 4, handoff dossier added Faz 7).

POST /v1/chat is the real-agent counterpart of the frontend's
/api/agent/message (Faz 2, scripted demoAgent.ts): same request/response
shape, but the reasoning is done by a real LLM through a LangGraph
tool-calling loop instead of a hand-written state machine.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, FastAPI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.graph import build_graph
from backend.agents.handoff import format_dossier, generate_handoff_summary
from backend.api.schemas import ChatRequest, ChatResponse, HandoffContext, ToolCallLogEntry
from backend.llm.factory import get_chat_model

app = FastAPI(
    title="FinVoice Ops — Agent Orchestrator",
    version="0.2.0",
    description="LangGraph tool-calling agent over mock-enterprise + RAG, with human handoff (Faz 4-7).",
)


@dataclass
class AgentRuntime:
    graph: object
    model: BaseChatModel  # kept unbound (no tools) — used for handoff summary generation


@lru_cache
def get_runtime() -> AgentRuntime:
    model = get_chat_model()
    return AgentRuntime(graph=build_graph(model), model=model)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, runtime: AgentRuntime = Depends(get_runtime)):
    tool_log: list[dict] = []
    handoff_box: dict = {}

    result = await runtime.graph.ainvoke(
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
        dossier = await generate_handoff_summary(runtime.model, result["messages"], reason)
        reply = f"Sizi bir müşteri temsilcisine aktarıyorum. Neden: {reason}"
        handoff = HandoffContext(
            customerName=dossier.customer_name,
            intent=dossier.intent,
            policyNumber=dossier.policy_number,
            collectedData=dossier.collected_data,
            sentiment=dossier.sentiment,
            reason=reason,
            summary=format_dossier(dossier, reason),
        )
    else:
        last = result["messages"][-1]
        reply = last.content if isinstance(last, AIMessage) else str(last.content)

    return ChatResponse(
        reply=reply,
        toolCalls=[ToolCallLogEntry(**entry) for entry in tool_log],
        handoff=handoff,
    )

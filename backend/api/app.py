"""Agent Orchestrator API (Faz 4, handoff dossier Faz 7, observability Faz 8).

POST /v1/chat is the real-agent counterpart of the frontend's
/api/agent/message (Faz 2, scripted demoAgent.ts): same request/response
shape, but the reasoning is done by a real LLM through a LangGraph
tool-calling loop instead of a hand-written state machine.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, FastAPI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage
from prometheus_fastapi_instrumentator import Instrumentator

from backend.agents.graph import build_graph
from backend.agents.handoff import format_dossier, generate_handoff_summary
from backend.api.schemas import ChatRequest, ChatResponse, HandoffContext, ToolCallLogEntry
from backend.api.tool_responses import format_verified_tool_reply
from backend.llm.factory import get_chat_model
from backend.observability.metrics import (
    CHAT_LATENCY_SECONDS,
    CHAT_TURNS_TOTAL,
    HANDOFF_TOTAL,
    TOOL_CALL_DURATION_SECONDS,
    TOOL_CALLS_TOTAL,
    record_session_seen,
)
from backend.observability.tracing import configure_tracing, get_tracer
from backend.tools.handoff_tools import HANDOFF_TOOL_NAME

configure_tracing("finvoice-backend")

app = FastAPI(
    title="FinVoice Ops — Agent Orchestrator",
    version="0.3.0",
    description=(
        "LangGraph tool-calling agent over mock-enterprise + RAG, with "
        "human handoff and observability (Faz 4-8)."
    ),
)

# Generic HTTP request metrics (latency, count, in-progress) — the
# finvoice_* business metrics below are what the generic ones can't tell you.
Instrumentator().instrument(app).expose(app)


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
    record_session_seen(req.sessionId)
    CHAT_TURNS_TOTAL.inc()
    turn_start = time.perf_counter()

    with get_tracer().start_as_current_span("chat_turn") as turn_span:
        turn_span.set_attribute("session_id", req.sessionId)

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

        for entry in tool_log:
            TOOL_CALLS_TOTAL.labels(tool=entry["name"], status=entry["status"]).inc()
            TOOL_CALL_DURATION_SECONDS.labels(tool=entry["name"]).observe(
                entry["durationMs"] / 1000
            )
        turn_span.set_attribute("tool_call_count", len(tool_log))

        handoff: HandoffContext | None = None
        if handoff_box.get("reason") is not None:
            reason = handoff_box["reason"] or "Belirtilmedi"
            trigger = "llm" if any(e["name"] == HANDOFF_TOOL_NAME for e in tool_log) else "guardrail"
            HANDOFF_TOTAL.labels(trigger=trigger).inc()
            turn_span.set_attribute("handoff.trigger", trigger)
            turn_span.set_attribute("handoff.reason", reason)

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
            verified_reply = format_verified_tool_reply(tool_log)
            if verified_reply is not None:
                reply = verified_reply

    CHAT_LATENCY_SECONDS.observe(time.perf_counter() - turn_start)

    return ChatResponse(
        reply=reply,
        toolCalls=[ToolCallLogEntry(**entry) for entry in tool_log],
        handoff=handoff,
        responseMode=result.get("response_mode", "guardrail" if handoff else "llm"),
    )

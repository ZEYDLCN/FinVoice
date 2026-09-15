"""LangGraph agent orchestrator (Faz 4, hard-trigger intake added Faz 7).

Graph shape (see ROADMAP.md §28 for the target diagram this simplifies):

    START -> intake --[hard trigger matched?]--> END (handoff, no LLM call)
                    \\-----------[no]-----------> agent --[has tool_calls?]--> tools --> agent  (loop)
                                                        \\-------[no]---------------------------> END
                                          tools --[transfer_to_human was called]-----------> END

`intake` is the Faz 7 guardrail node (see guardrails.py): explicit "get me
a human" requests and obvious frustration are caught here, deterministically,
before the LLM is even invoked. Everything else reaches `agent` unchanged.

Unlike the Faz 2 `demoAgent.ts` scripted state machine, there is no
hand-written "which slot is missing" logic here — the model itself decides
whether it has enough information, and if not, its response is a plain-text
question with no tool call, which naturally ends the turn (routes to END)
so the question reaches the user.
"""
from __future__ import annotations

import re
import time
from typing import Any, Optional
from uuid import uuid4

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import MessagesState

from backend.agents.guardrails import detect_hard_handoff_trigger
from backend.agents.prompts import SYSTEM_PROMPT
from backend.observability.tracing import get_tracer
from backend.tools.handoff_tools import HANDOFF_TOOL_NAME
from backend.tools.registry import TOOLS_BY_NAME


class AgentState(MessagesState):
    """Conversation messages plus the source of the final response."""

    response_mode: str
    forced_structured_tool: bool


def _latest_human_text(messages: list) -> str:
    for message in reversed(messages):
        if isinstance(message, HumanMessage) and isinstance(message.content, str):
            return message.content.strip()
    return ""


def _latest_human_identifier(messages: list, pattern: str) -> Optional[str]:
    for message in reversed(messages):
        if isinstance(message, HumanMessage) and isinstance(message.content, str):
            match = re.search(pattern, message.content, re.IGNORECASE)
            if match is not None:
                return match.group(0).upper()
    return None


def _preflight_reply(messages: list) -> Optional[str]:
    """Handle safety-critical missing slots before a small local LLM can invent them."""
    text = _latest_human_text(messages)
    normalized = text.lower().strip(" !.,?")

    if normalized in {"merhaba", "selam", "selamlar", "günaydın", "iyi akşamlar"}:
        return "Merhaba! Size nasıl yardımcı olabilirim?"
    if normalized in {"nasılsın", "nasilsin", "naber", "iyi misin"}:
        return "Teşekkür ederim, iyiyim. Size nasıl yardımcı olabilirim?"

    has_claim_id = re.search(r"\bclm-\d+\b", normalized, re.IGNORECASE) is not None
    asks_claim_status = "hasar" in normalized and any(
        phrase in normalized for phrase in ("durum", "sorgu", "ne aşamada", "sonuç")
    )
    if asks_claim_status and not has_claim_id:
        return "Elbette. Hasar dosya numaranızı paylaşır mısınız? Örneğin, CLM-98221."

    has_policy_id = re.search(r"\btr-\d+\b", normalized, re.IGNORECASE) is not None
    asks_personal_coverage = any(word in normalized for word in ("kaskom", "poliçem", "policem")) and any(
        word in normalized
        for word in ("kapsıyor", "kapsiyor", "teminat", "çekici", "cekici", "ikame")
    )
    if asks_personal_coverage and not has_policy_id:
        return "Kontrol edebilmem için poliçe numaranızı paylaşır mısınız? Örneğin, TR-92831."

    reports_lost_card = "kart" in normalized and any(
        phrase in normalized for phrase in ("kaybett", "kayıp", "çalınd", "calind")
    )
    if reports_lost_card and "cust-" not in normalized:
        return "Kartınızı güvenle kontrol edebilmem için müşteri numaranızı paylaşır mısınız? Örneğin, CUST-1001."

    wants_new_claim = "hasar" in normalized and any(
        phrase in normalized for phrase in ("dosyası aç", "dosyasi ac", "kayd", "oluştur", "olustur", "kaza")
    )
    if wants_new_claim and not has_policy_id:
        return "Hasar dosyasını başlatabilmem için poliçe numaranızı paylaşır mısınız? Örneğin, TR-92831."

    return None


def _forced_structured_call(messages: list) -> Optional[AIMessage]:
    """Route unambiguous identifier lookups without relying on a small LLM.

    Qwen remains responsible for conversational and ambiguous requests. Exact
    policy-status questions are deterministic because answering them without
    consulting the enterprise API would be misleading.
    """
    if not messages or not isinstance(messages[-1], HumanMessage):
        return None

    text = _latest_human_text(messages)
    normalized = text.lower()
    claim_match = re.search(r"\bclm-\d+\b", text, re.IGNORECASE)
    if claim_match is not None and any(
        phrase in normalized
        for phrase in ("hasar", "durum", "sorgu", "ne aşamada", "sonuç", "sonuc")
    ):
        return AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_claim_status",
                    "args": {"claim_id": claim_match.group(0).upper()},
                    "id": f"route-claim-{uuid4().hex}",
                }
            ],
        )

    current_policy_match = re.search(r"\btr-\d+\b", text, re.IGNORECASE)
    policy_number = (
        current_policy_match.group(0).upper()
        if current_policy_match is not None
        else _latest_human_identifier(messages, r"\btr-\d+\b")
    )

    coverage_topic = next(
        (
            topic
            for phrases, topic in (
                (("çekici", "cekici", "towing"), "çekici"),
                (("cam", "glass"), "cam"),
                (("hırsızlık", "hirsizlik", "theft"), "hırsızlık"),
                (("yangın", "yangin", "fire"), "yangın"),
                (("çarpışma", "carpisma", "collision"), "çarpışma"),
            )
            if any(phrase in normalized for phrase in phrases)
        ),
        None,
    )
    asks_coverage = coverage_topic is not None and any(
        phrase in normalized
        for phrase in ("kaps", "teminat", "var mı", "var mi", "dahil", "karşılıyor", "karsiliyor")
    )
    if policy_number is not None and coverage_topic is not None and asks_coverage:
        return AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "check_policy_coverage",
                    "args": {"policy_number": policy_number, "topic": coverage_topic},
                    "id": f"route-coverage-{uuid4().hex}",
                }
            ],
        )

    if current_policy_match is None:
        return None

    asks_policy_status = any(
        phrase in normalized
        for phrase in (
            "aktif",
            "durum",
            "geçerli",
            "gecerli",
            "kontrol",
            "süresi",
            "suresi",
            "iptal",
        )
    )
    mentions_coverage = any(
        phrase in normalized
        for phrase in (
            "kapsıyor",
            "kapsiyor",
            "teminat",
            "çekici",
            "cekici",
            "ikame",
        )
    )
    asks_claim_creation = "hasar" in normalized and any(
        phrase in normalized for phrase in ("aç", "ac", "oluştur", "olustur", "kaza")
    )
    if not asks_policy_status or mentions_coverage or asks_claim_creation:
        return None

    return AIMessage(
        content="",
        tool_calls=[
            {
                "name": "get_policy",
                "args": {"policy_number": current_policy_match.group(0).upper()},
                "id": f"route-policy-{uuid4().hex}",
            }
        ],
    )


def _named_tools(*names: str) -> list:
    return [TOOLS_BY_NAME[name] for name in names if name in TOOLS_BY_NAME]


def _tools_for_conversation(messages: list) -> list:
    """Expose only the tools relevant to the latest conversation flow."""
    human_texts = [
        message.content.lower()
        for message in messages
        if isinstance(message, HumanMessage) and isinstance(message.content, str)
    ]
    if not human_texts:
        return _named_tools(HANDOFF_TOOL_NAME)

    latest = human_texts[-1].strip(" !.,?")
    if latest in {
        "merhaba",
        "selam",
        "selamlar",
        "nasılsın",
        "nasilsin",
        "naber",
        "iyi misin",
        "günaydın",
        "iyi akşamlar",
    }:
        return []

    for text in reversed(human_texts):
        if any(word in text for word in ("kart", "card", "cust-", "dolandır", "tanımadığım işlem")):
            return _named_tools(
                "get_customer",
                "get_cards",
                "freeze_card",
                "request_new_card",
                HANDOFF_TOOL_NAME,
            )
        if "clm-" in text or (
            "hasar" in text
            and any(word in text for word in ("durum", "sorgu", "ne aşamada", "sonuç"))
        ):
            return _named_tools("get_claim_status", HANDOFF_TOOL_NAME)
        if any(
            word in text
            for word in (
                "kapsıyor",
                "kapsiyor",
                "teminat",
                "çekici",
                "cekici",
                "ikame araç",
                "deprem",
                "yangın",
                "hırsızlık",
            )
        ):
            return _named_tools(
                "get_policy",
                "check_policy_coverage",
                "search_policy_documents",
                HANDOFF_TOOL_NAME,
            )
        if any(word in text for word in ("kaza", "hasar dosyası aç", "hasar kaydı", "hasar oluştur")):
            return _named_tools("get_policy", "create_claim", HANDOFF_TOOL_NAME)
        if "poliçe" in text or "police" in text or "tr-" in text:
            return _named_tools("get_policy", HANDOFF_TOOL_NAME)

    return _named_tools("search_policy_documents", HANDOFF_TOOL_NAME)


def build_graph(model: BaseChatModel, checkpointer: Optional[BaseCheckpointSaver] = None):
    """Compiles the agent graph, binding `model` (real ChatOllama in
    production, ScriptedChatModel in tests) with the tool registry once."""
    async def intake_node(state: AgentState, config: RunnableConfig) -> dict:
        last = state["messages"][-1]
        if isinstance(last, HumanMessage) and isinstance(last.content, str):
            reason = detect_hard_handoff_trigger(last.content)
            if reason is not None:
                handoff_box = config.get("configurable", {}).get("handoff_box")
                if handoff_box is not None:
                    handoff_box["reason"] = reason
        return {}

    async def agent_node(state: AgentState) -> dict:
        messages = state["messages"]
        preflight_reply = _preflight_reply(messages)
        if preflight_reply is not None:
            return {
                "messages": [AIMessage(content=preflight_reply)],
                "response_mode": "validation",
                "forced_structured_tool": False,
            }
        forced_call = _forced_structured_call(messages)
        if forced_call is not None:
            return {
                "messages": [forced_call],
                "response_mode": "tool",
                "forced_structured_tool": True,
            }
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]
        eligible_tools = _tools_for_conversation(messages)
        chat_model = model.bind_tools(eligible_tools) if eligible_tools else model
        response = await chat_model.ainvoke(messages)
        return {
            "messages": [response],
            "response_mode": "llm",
            "forced_structured_tool": False,
        }

    async def tools_node(state: AgentState, config: RunnableConfig) -> dict:
        last = state["messages"][-1]
        configurable = config.get("configurable", {})
        tool_log: Optional[list[dict[str, Any]]] = configurable.get("tool_log")
        handoff_box: Optional[dict[str, Any]] = configurable.get("handoff_box")

        tool_messages: list[ToolMessage] = []
        for call in last.tool_calls:
            tool = TOOLS_BY_NAME.get(call["name"])
            with get_tracer().start_as_current_span(f"tool.{call['name']}") as span:
                span.set_attribute("tool.name", call["name"])
                start = time.perf_counter()
                error: Optional[str] = None
                try:
                    if tool is None:
                        raise KeyError(f"Bilinmeyen tool: {call['name']}")
                    result = await tool.ainvoke(call["args"])
                    status = "success"
                except Exception as exc:  # noqa: BLE001 - surfaced to the LLM as a tool result
                    result = {"error": str(exc)}
                    status = "error"
                    error = str(exc)
                    span.record_exception(exc)
                duration_ms = round((time.perf_counter() - start) * 1000)
                span.set_attribute("tool.status", status)
                span.set_attribute("tool.duration_ms", duration_ms)

            if tool_log is not None:
                tool_log.append(
                    {
                        "id": call["id"],
                        "name": call["name"],
                        "status": status,
                        "durationMs": duration_ms,
                        "input": call["args"],
                        "output": None if status == "error" else result,
                        "error": error,
                    }
                )

            if call["name"] == HANDOFF_TOOL_NAME and status == "success" and handoff_box is not None:
                handoff_box["reason"] = call["args"].get("reason", "")

            tool_messages.append(
                ToolMessage(content=str(result), tool_call_id=call["id"], name=call["name"])
            )

        return {"messages": tool_messages}

    def route_after_intake(state: AgentState, config: RunnableConfig) -> str:
        handoff_box = config.get("configurable", {}).get("handoff_box")
        if handoff_box and handoff_box.get("reason") is not None:
            return END
        return "agent"

    def route_after_agent(state: AgentState) -> str:
        last = state["messages"][-1]
        if isinstance(last, AIMessage) and last.tool_calls:
            return "tools"
        return END

    def route_after_tools(state: AgentState, config: RunnableConfig) -> str:
        handoff_box = config.get("configurable", {}).get("handoff_box")
        if handoff_box and handoff_box.get("reason") is not None:
            return END
        if state.get("forced_structured_tool", False):
            return END
        return "agent"

    graph = StateGraph(AgentState)
    graph.add_node("intake", intake_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tools_node)
    graph.set_entry_point("intake")
    graph.add_conditional_edges("intake", route_after_intake, {"agent": "agent", END: END})
    graph.add_conditional_edges("agent", route_after_agent, {"tools": "tools", END: END})
    graph.add_conditional_edges("tools", route_after_tools, {"agent": "agent", END: END})
    return graph.compile(checkpointer=checkpointer or MemorySaver())

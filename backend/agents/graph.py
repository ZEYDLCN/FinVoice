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

import time
from typing import Any, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import MessagesState

from backend.agents.guardrails import detect_hard_handoff_trigger
from backend.agents.prompts import SYSTEM_PROMPT
from backend.tools.handoff_tools import HANDOFF_TOOL_NAME
from backend.tools.registry import ALL_TOOLS, TOOLS_BY_NAME


class AgentState(MessagesState):
    """Just the message history — LangGraph's `add_messages` reducer
    handles appending across turns and across the agent<->tools loop."""


def build_graph(model: BaseChatModel, checkpointer: Optional[BaseCheckpointSaver] = None):
    """Compiles the agent graph, binding `model` (real ChatOllama in
    production, ScriptedChatModel in tests) with the tool registry once."""
    bound_model = model.bind_tools(ALL_TOOLS)

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
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]
        response = await bound_model.ainvoke(messages)
        return {"messages": [response]}

    async def tools_node(state: AgentState, config: RunnableConfig) -> dict:
        last = state["messages"][-1]
        configurable = config.get("configurable", {})
        tool_log: Optional[list[dict[str, Any]]] = configurable.get("tool_log")
        handoff_box: Optional[dict[str, Any]] = configurable.get("handoff_box")

        tool_messages: list[ToolMessage] = []
        for call in last.tool_calls:
            tool = TOOLS_BY_NAME.get(call["name"])
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
            duration_ms = round((time.perf_counter() - start) * 1000)

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

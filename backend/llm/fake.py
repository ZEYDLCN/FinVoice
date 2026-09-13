"""A fully scripted chat model for tests — no network, no Ollama needed.

Mirrors the same pattern used elsewhere in this repo for testing without a
heavy/networked dependency: `voice/stt/transcriber.py`'s `FakeTranscriber`
and `frontend/src/lib/demoAgent.ts`. Here, instead of faking the whole
agent, we fake only the LLM: the real LangGraph graph, tool-calling loop,
and tool implementations all run for real — only the "brain" is canned.
"""
from __future__ import annotations

from typing import Any, Optional

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field, PrivateAttr


class ScriptedChatModel(BaseChatModel):
    """Pops one canned `AIMessage` off `responses` per `_generate` call, in
    order. Raises `IndexError` if the script runs out — a test bug (the
    graph called the model more times than expected), not something to
    silently paper over.
    """

    responses: list[AIMessage] = Field(default_factory=list)
    _index: int = PrivateAttr(default=0)

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        if self._index >= len(self.responses):
            raise IndexError(
                f"ScriptedChatModel ran out of canned responses after {self._index} calls"
            )
        message = self.responses[self._index]
        self._index += 1
        return ChatResult(generations=[ChatGeneration(message=message)])

    @property
    def _llm_type(self) -> str:
        return "scripted-fake-chat-model"

    def bind_tools(self, tools, *, tool_choice=None, **kwargs):
        # The real ChatOllama uses this to attach tool JSON schemas so the
        # model can request calls. Our script already dictates exactly which
        # tool calls happen and when, so there's nothing to bind — just
        # return self so `agents.graph.build_graph()` can call it uniformly
        # for both the real and fake model.
        return self


class StaticReplyChatModel(BaseChatModel):
    """Always returns the same fixed, tool-free reply — used in production
    when `FINVOICE_AGENT_LLM_BACKEND=fake` (no Ollama server available).
    This is NOT a reasoning stand-in like `ScriptedChatModel`; it exists so
    the API can be started and smoke-tested (health check, request/response
    shape, tool-log/handoff plumbing) without a real LLM. See
    `backend/README.md`.
    """

    reply: str = (
        "Şu anda gerçek bir dil modeline bağlı değilim "
        "(FINVOICE_AGENT_LLM_BACKEND=fake) — bu yalnızca API'nin ayakta "
        "olduğunu göstermek için bir yanıt."
    )

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=self.reply))])

    @property
    def _llm_type(self) -> str:
        return "static-fake-chat-model"

    def bind_tools(self, tools, *, tool_choice=None, **kwargs):
        return self

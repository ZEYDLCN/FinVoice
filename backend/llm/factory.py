"""Builds the chat model used by the running API service.

Tests never call this — they construct a `ScriptedChatModel` (see fake.py)
directly and hand it to `agents.graph.build_graph()`, so they don't need a
running Ollama server or a downloaded model. `get_chat_model()` is what
`api/app.py` actually calls at startup; it returns a real `ChatOllama`
unless `FINVOICE_AGENT_LLM_BACKEND=fake`, in which case it returns a
`StaticReplyChatModel` — see that class for why this exists.
"""
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_ollama import ChatOllama

from backend.api.config import get_settings
from backend.llm.fake import StaticReplyChatModel


def get_chat_model() -> BaseChatModel:
    settings = get_settings()
    if settings.llm_backend == "fake":
        return StaticReplyChatModel()
    return ChatOllama(
        base_url=settings.ollama_host,
        model=settings.agent_model,
        temperature=settings.agent_temperature,
        reasoning=False,
        num_predict=160,
    )

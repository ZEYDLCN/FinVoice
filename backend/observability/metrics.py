"""Prometheus metrics (Faz 8, spec §21-22).

Exposed at GET /metrics (wired up in api/app.py via
prometheus-fastapi-instrumentator, which also adds generic HTTP request
metrics automatically). These are the business/agent-specific ones that
generic HTTP instrumentation can't give us — a "200 OK" tells you nothing
about whether the call resulted in a successful `create_claim` or a
handoff.
"""
from prometheus_client import Counter, Gauge, Histogram

CHAT_TURNS_TOTAL = Counter(
    "finvoice_chat_turns_total", "Toplam işlenen /v1/chat turu sayısı"
)

CHAT_LATENCY_SECONDS = Histogram(
    "finvoice_chat_latency_seconds",
    "Bir /v1/chat turunun toplam işlem süresi (LLM + tool çağrıları dahil)",
)

TOOL_CALLS_TOTAL = Counter(
    "finvoice_tool_calls_total",
    "Agent tool çağrısı sayısı",
    ["tool", "status"],
)

TOOL_CALL_DURATION_SECONDS = Histogram(
    "finvoice_tool_call_duration_seconds",
    "Tek bir tool çağrısının süresi",
    ["tool"],
)

HANDOFF_TOTAL = Counter(
    "finvoice_handoff_total",
    "Human handoff sayısı",
    ["trigger"],  # "guardrail" (deterministik) | "llm" (modelin kararı)
)

ACTIVE_SESSIONS = Gauge(
    "finvoice_active_sessions",
    "Bu proses ömrü boyunca görülen benzersiz session (thread_id) sayısı",
)

_seen_sessions: set[str] = set()


def record_session_seen(session_id: str) -> None:
    if session_id not in _seen_sessions:
        _seen_sessions.add(session_id)
        ACTIVE_SESSIONS.set(len(_seen_sessions))

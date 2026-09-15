"""Verifies real OpenTelemetry spans get created around tool calls — using
`InMemorySpanExporter` (a real, standard SDK testing utility) instead of a
running Jaeger/Tempo collector, so this needs no network."""
import pytest
from langchain_core.messages import AIMessage, HumanMessage
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from backend.agents.graph import build_graph
from backend.llm.fake import ScriptedChatModel


@pytest.fixture
def span_exporter(monkeypatch):
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("test")
    # The global OpenTelemetry TracerProvider can only be set once per
    # process (api/app.py already did so at import time), so we monkeypatch
    # the one call site that matters instead of fighting that singleton.
    monkeypatch.setattr("backend.agents.graph.get_tracer", lambda: tracer)
    return exporter


async def test_successful_tool_call_produces_a_span(span_exporter, mock_enterprise):
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "TR-92831"}, "id": "c1"}
                ],
            ),
            AIMessage(content="Poliçeniz aktif görünüyor."),
        ]
    )
    graph = build_graph(model)

    await graph.ainvoke(
        {"messages": [HumanMessage(content="TR-92831 poliçemi kontrol et")]},
        config={"configurable": {"thread_id": "trace-t1", "tool_log": [], "handoff_box": {}}},
    )

    spans = span_exporter.get_finished_spans()
    assert len(spans) == 1
    span = spans[0]
    assert span.name == "tool.get_policy"
    assert span.attributes["tool.name"] == "get_policy"
    assert span.attributes["tool.status"] == "success"
    assert span.attributes["tool.duration_ms"] >= 0


async def test_failed_tool_call_records_exception_on_span(span_exporter, mock_enterprise):
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "UNKNOWN"}, "id": "c1"}
                ],
            ),
            AIMessage(content="Bulamadım."),
        ]
    )
    graph = build_graph(model)

    await graph.ainvoke(
        {"messages": [HumanMessage(content="UNKNOWN poliçemi kontrol et")]},
        config={"configurable": {"thread_id": "trace-t2", "tool_log": [], "handoff_box": {}}},
    )

    spans = span_exporter.get_finished_spans()
    assert len(spans) == 1
    assert spans[0].attributes["tool.status"] == "error"
    assert len(spans[0].events) == 1  # record_exception() adds an event
    assert spans[0].events[0].name == "exception"


async def test_multiple_tool_calls_produce_multiple_spans(span_exporter, mock_enterprise):
    model = ScriptedChatModel(
        responses=[
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "TR-92831"}, "id": "c1"}
                ],
            ),
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "create_claim",
                        "args": {
                            "policy_number": "TR-92831",
                            "accident_date": "2026-09-10",
                            "location": "Istanbul",
                            "description": "Rear collision",
                        },
                        "id": "c2",
                    }
                ],
            ),
            AIMessage(content="Hasar kaydınız oluşturuldu: CLM-98221"),
        ]
    )
    graph = build_graph(model)

    await graph.ainvoke(
            {
                "messages": [
                    HumanMessage(
                        content=(
                            "TR-92831 poliçemle 2026-09-10 tarihinde İstanbul'da kaza yaptım; "
                            "arkadan çarpıldım. Hasar dosyası açar mısın?"
                        )
                    )
                ]
            },
        config={"configurable": {"thread_id": "trace-t3", "tool_log": [], "handoff_box": {}}},
    )

    span_names = [s.name for s in span_exporter.get_finished_spans()]
    assert span_names == ["tool.get_policy", "tool.create_claim"]

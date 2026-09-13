from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from backend.api.app import AgentRuntime, app, get_runtime
from backend.agents.graph import build_graph
from backend.llm.fake import ScriptedChatModel


def _client_with_scripted(responses):
    model = ScriptedChatModel(responses=responses)
    app.dependency_overrides[get_runtime] = lambda: AgentRuntime(graph=build_graph(model), model=model)
    return TestClient(app)


def test_metrics_endpoint_exposes_prometheus_format():
    client = TestClient(app)
    resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "text/plain" in resp.headers["content-type"]
    assert "finvoice_chat_turns_total" in resp.text


def test_chat_turn_increments_metrics(mock_enterprise):
    client = _client_with_scripted(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "get_policy", "args": {"policy_number": "TR-92831"}, "id": "c1"}
                ],
            ),
            AIMessage(content="Poliçeniz aktif görünüyor."),
        ]
    )
    before = client.get("/metrics").text
    turns_before = _extract_counter(before, "finvoice_chat_turns_total")

    client.post("/v1/chat", json={"sessionId": "metrics-1", "text": "TR-92831 poliçemi kontrol et"})

    after = client.get("/metrics").text
    assert _extract_counter(after, "finvoice_chat_turns_total") == turns_before + 1
    assert 'finvoice_tool_calls_total{status="success",tool="get_policy"}' in after

    app.dependency_overrides.clear()


def test_guardrail_handoff_increments_handoff_metric():
    client = _client_with_scripted(responses=[])
    client.post("/v1/chat", json={"sessionId": "metrics-2", "text": "Bir temsilciyle görüşmek istiyorum."})

    after = client.get("/metrics").text
    assert 'finvoice_handoff_total{trigger="guardrail"}' in after

    app.dependency_overrides.clear()


def _extract_counter(metrics_text: str, name: str) -> float:
    for line in metrics_text.splitlines():
        if line.startswith(f"{name} "):
            return float(line.split()[-1])
    return 0.0

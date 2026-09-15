import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from backend.agents.graph import build_graph
from backend.api.app import AgentRuntime, app, get_runtime
from backend.llm.fake import ScriptedChatModel


def _client_with_scripted(responses: list[AIMessage], structured_responses=None) -> TestClient:
    model = ScriptedChatModel(responses=responses, structured_responses=structured_responses or [])
    app.dependency_overrides[get_runtime] = lambda: AgentRuntime(graph=build_graph(model), model=model)
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_health():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_chat_tool_call_then_reply(mock_enterprise):
    client = _client_with_scripted([])
    resp = client.post("/v1/chat", json={"sessionId": "s1", "text": "TR-92831 poliçemi kontrol et"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == (
        "TR-92831 numaralı poliçeniz aktif. "
        "Geçerlilik tarihi: 2026-01-01 - 2026-12-31."
    )
    assert body["responseMode"] == "tool"
    assert len(body["toolCalls"]) == 1
    assert body["toolCalls"][0]["name"] == "get_policy"
    assert body["handoff"] is None


def test_chat_handoff_via_llm_decision(mock_enterprise):
    """A handoff reason the guardrail gate does NOT catch — the model
    decides via `transfer_to_human`."""
    from backend.agents.handoff import HandoffSummary

    dossier = HandoffSummary(
        customer_name="Zeyd Alcan",
        intent="Şüpheli işlem bildirimi",
        sentiment="Endişeli",
        summary="Müşteri hesabında tanımadığı işlemler olduğunu bildirdi.",
    )
    client = _client_with_scripted(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "transfer_to_human",
                        "args": {"reason": "Dolandırıcılık şüphesi"},
                        "id": "c1",
                    }
                ],
            ),
        ],
        structured_responses=[dossier],
    )
    resp = client.post(
        "/v1/chat",
        json={"sessionId": "s2", "text": "Hesabımda tanımadığım işlemler var, garip bir durum."},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["handoff"]["reason"] == "Dolandırıcılık şüphesi"
    assert body["handoff"]["customerName"] == "Zeyd Alcan"
    assert body["handoff"]["sentiment"] == "Endişeli"
    assert "Zeyd Alcan" in body["handoff"]["summary"]
    assert "temsilci" in body["reply"].lower()


def test_chat_handoff_via_guardrail_gate(mock_enterprise):
    """Faz 7: explicit human request is intercepted before the LLM; the
    handoff summary is still generated from the (short) transcript so far."""
    client = _client_with_scripted(responses=[])
    resp = client.post(
        "/v1/chat", json={"sessionId": "s3", "text": "Bir temsilciyle görüşmek istiyorum."}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["handoff"]["reason"] == "Kullanıcı açıkça bir müşteri temsilcisiyle görüşmek istedi"
    assert body["toolCalls"] == []
    # no structured_responses configured -> generate_handoff_summary falls
    # back gracefully instead of raising
    assert body["handoff"]["summary"]

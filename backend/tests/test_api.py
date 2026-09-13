import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from backend.agents.graph import build_graph
from backend.api.app import app, get_graph
from backend.llm.fake import ScriptedChatModel


def _client_with_scripted(responses: list[AIMessage]) -> TestClient:
    app.dependency_overrides[get_graph] = lambda: build_graph(ScriptedChatModel(responses=responses))
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
    resp = client.post("/v1/chat", json={"sessionId": "s1", "text": "TR-92831 poliçemi kontrol et"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Poliçeniz aktif görünüyor."
    assert len(body["toolCalls"]) == 1
    assert body["toolCalls"][0]["name"] == "get_policy"
    assert body["handoff"] is None


def test_chat_handoff(mock_enterprise):
    client = _client_with_scripted(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "transfer_to_human",
                        "args": {"reason": "Kullanıcı temsilci istedi"},
                        "id": "c1",
                    }
                ],
            ),
        ]
    )
    resp = client.post("/v1/chat", json={"sessionId": "s2", "text": "Bir temsilciyle görüşmek istiyorum."})
    assert resp.status_code == 200
    body = resp.json()
    assert body["handoff"]["reason"] == "Kullanıcı temsilci istedi"
    assert "temsilci" in body["reply"].lower()

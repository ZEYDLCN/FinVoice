import pytest
from fastapi.testclient import TestClient

from rag.service.app import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_search_returns_relevant_result(client):
    resp = client.post("/v1/search", json={"query": "İkame araç kaç gün sağlanır?"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["results"]) >= 1
    assert body["results"][0]["source"] == "kasko_sartlari.pdf"
    assert 0 <= body["results"][0]["score"] <= 1.0001


def test_search_respects_top_k(client):
    resp = client.post("/v1/search", json={"query": "poliçe kart hasar", "topK": 1})
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 1


def test_metrics_endpoint(client):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "http_requests_total" in resp.text

def test_metrics_endpoint(client):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "text/plain" in resp.headers["content-type"]
    # generic HTTP metrics from prometheus-fastapi-instrumentator
    assert "http_requests_total" in resp.text

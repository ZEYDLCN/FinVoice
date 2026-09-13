def test_get_customer(client):
    resp = client.get("/api/customers/CUST-001")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Zeyd Alcan"


def test_get_customer_not_found(client):
    resp = client.get("/api/customers/CUST-999")
    assert resp.status_code == 404


def test_search_customers(client):
    resp = client.get("/api/customers", params={"q": "ayşe"})
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "Ayşe Yılmaz" in names

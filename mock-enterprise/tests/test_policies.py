def test_get_policy(client):
    resp = client.get("/api/policies/TR-92831")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ACTIVE"
    assert body["vehicle"] == "Seat Leon"


def test_get_policy_not_found(client):
    resp = client.get("/api/policies/UNKNOWN")
    assert resp.status_code == 404


def test_list_policies_by_customer(client):
    resp = client.get("/api/policies", params={"customerId": "CUST-001"})
    assert resp.status_code == 200
    policies = resp.json()
    assert len(policies) == 1
    assert policies[0]["policyNumber"] == "TR-92831"


def test_coverage_covered(client):
    resp = client.get("/api/policies/TR-92831/coverage", params={"topic": "çekici"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["covered"] is True
    assert body["topic"] == "towing"


def test_coverage_not_covered(client):
    resp = client.get("/api/policies/TR-10442/coverage", params={"topic": "towing"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["covered"] is False

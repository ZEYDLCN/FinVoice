def test_create_and_get_claim(client):
    resp = client.post(
        "/api/claims",
        json={
            "policyNumber": "TR-92831",
            "accidentDate": "2026-09-10",
            "location": "Istanbul",
            "description": "Rear collision",
        },
    )
    assert resp.status_code == 201
    claim = resp.json()
    assert claim["status"] == "OPEN"
    claim_id = claim["claimId"]

    resp2 = client.get(f"/api/claims/{claim_id}")
    assert resp2.status_code == 200
    assert resp2.json()["claimId"] == claim_id


def test_create_claim_on_inactive_policy_fails(client):
    resp = client.post(
        "/api/claims",
        json={
            "policyNumber": "TR-10442",
            "accidentDate": "2026-09-10",
            "location": "Istanbul",
            "description": "Rear collision",
        },
    )
    assert resp.status_code == 409


def test_create_claim_unknown_policy(client):
    resp = client.post(
        "/api/claims",
        json={
            "policyNumber": "UNKNOWN",
            "accidentDate": "2026-09-10",
            "location": "Istanbul",
            "description": "Rear collision",
        },
    )
    assert resp.status_code == 404


def test_update_claim_status(client):
    create = client.post(
        "/api/claims",
        json={
            "policyNumber": "TR-92831",
            "accidentDate": "2026-09-10",
            "location": "Istanbul",
            "description": "Rear collision",
        },
    ).json()

    resp = client.patch(
        f"/api/claims/{create['claimId']}", json={"status": "EXPERT_REVIEW"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "EXPERT_REVIEW"


def test_list_claims_by_policy(client):
    client.post(
        "/api/claims",
        json={
            "policyNumber": "TR-92831",
            "accidentDate": "2026-09-10",
            "location": "Istanbul",
            "description": "Rear collision",
        },
    )
    resp = client.get("/api/claims", params={"policyNumber": "TR-92831"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

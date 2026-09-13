def test_create_and_get_ticket(client):
    resp = client.post(
        "/api/support/tickets",
        json={
            "customerId": "CUST-001",
            "subject": "Kart sorunu",
            "description": "Kartım hatalı görünüyor.",
        },
    )
    assert resp.status_code == 201
    ticket = resp.json()
    assert ticket["status"] == "OPEN"

    resp2 = client.get(f"/api/support/tickets/{ticket['ticketId']}")
    assert resp2.status_code == 200


def test_create_ticket_unknown_customer(client):
    resp = client.post(
        "/api/support/tickets",
        json={
            "customerId": "CUST-999",
            "subject": "x",
            "description": "y",
        },
    )
    assert resp.status_code == 404


def test_get_ticket_not_found(client):
    resp = client.get("/api/support/tickets/TCK-9999")
    assert resp.status_code == 404

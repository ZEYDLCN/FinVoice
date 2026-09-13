def test_list_customer_cards(client):
    resp = client.get("/api/customers/CUST-001/cards")
    assert resp.status_code == 200
    cards = resp.json()
    assert len(cards) == 1
    assert cards[0]["last4"] == "4821"


def test_freeze_card(client):
    resp = client.post("/api/cards/CARD-9001/freeze")
    assert resp.status_code == 200
    assert resp.json()["status"] == "FROZEN"


def test_freeze_unknown_card(client):
    resp = client.post("/api/cards/CARD-0000/freeze")
    assert resp.status_code == 404


def test_request_replacement_card(client):
    resp = client.post("/api/cards/CARD-9001/request-replacement")
    assert resp.status_code == 200
    body = resp.json()
    assert body["replacesCardId"] == "CARD-9001"
    assert body["status"] == "PENDING"

    old_card = client.get("/api/customers/CUST-001/cards").json()
    statuses = {c["cardId"]: c["status"] for c in old_card}
    assert statuses["CARD-9001"] == "CANCELLED"
    assert statuses[body["newCardId"]] == "PENDING"

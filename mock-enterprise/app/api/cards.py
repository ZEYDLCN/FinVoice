from fastapi import APIRouter

from app.data.store import store
from app.models.card import Card, FreezeCardResponse, NewCardRequestResponse

router = APIRouter(tags=["cards"])


@router.get("/customers/{customer_id}/cards", response_model=list[Card])
def list_customer_cards(customer_id: str):
    store.get_customer(customer_id)  # 404s if unknown
    return store.list_cards(customer_id)


@router.post("/cards/{card_id}/freeze", response_model=FreezeCardResponse)
def freeze_card(card_id: str):
    card = store.freeze_card(card_id)
    return FreezeCardResponse(cardId=card.card_id, status=card.status)


@router.post("/cards/{card_id}/request-replacement", response_model=NewCardRequestResponse)
def request_replacement_card(card_id: str):
    new_card = store.request_new_card(card_id)
    return NewCardRequestResponse(
        newCardId=new_card.card_id,
        replacesCardId=card_id,
        status=new_card.status,
        estimatedDeliveryDays=5,
    )

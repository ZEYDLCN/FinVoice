from langchain_core.tools import tool

from . import mock_client


@tool
async def get_cards(customer_id: str) -> list[dict]:
    """Bir müşterinin tüm kartlarını (durumlarıyla birlikte) listeler.

    Args:
        customer_id: Müşteri ID'si, örn. "CUST-001".
    """
    return await mock_client.list_customer_cards(customer_id)


@tool
async def freeze_card(card_id: str) -> dict:
    """Bir kartı dondurur (kayıp/çalıntı bildirimi sonrası güvenlik önlemi).
    Hangi kartın dondurulacağından emin değilsen önce `get_cards` ile
    müşterinin kartlarını listele ve kullanıcıya sor.

    Args:
        card_id: Kart ID'si, örn. "CARD-9001".
    """
    return await mock_client.freeze_card(card_id)


@tool
async def request_new_card(card_id: str) -> dict:
    """Dondurulmuş/iptal edilmiş bir kartın yerine yeni kart talebi oluşturur.

    Args:
        card_id: Yerine yenisi istenen (genellikle az önce dondurulan) kart ID'si.
    """
    return await mock_client.request_replacement_card(card_id)

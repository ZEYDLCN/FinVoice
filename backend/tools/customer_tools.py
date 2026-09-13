from langchain_core.tools import tool

from . import mock_client


@tool
async def get_customer(customer_id: str) -> dict:
    """Müşteri bilgilerini (ad, e-posta, telefon) müşteri ID'sine göre getirir.

    Args:
        customer_id: Müşteri ID'si, örn. "CUST-001".
    """
    return await mock_client.get_customer(customer_id)

from langchain_core.tools import tool

from . import mock_client


@tool
async def create_support_ticket(customer_id: str, subject: str, description: str) -> dict:
    """Yukarıdaki tool'ların hiçbiriyle çözülemeyen bir talep için genel bir
    destek kaydı (ticket) oluşturur.

    Args:
        customer_id: Müşteri ID'si.
        subject: Kısa konu başlığı.
        description: Talebin detaylı açıklaması.
    """
    return await mock_client.create_support_ticket(customer_id, subject, description)

from langchain_core.tools import tool

from . import mock_client


@tool
async def create_claim(
    policy_number: str, accident_date: str, location: str, description: str
) -> dict:
    """Yeni bir hasar dosyası (claim) oluşturur. Bunu çağırmadan önce
    `get_policy` ile poliçenin ACTIVE olduğunu doğrulamış olmalısın; poliçe
    ACTIVE değilse bu tool'u çağırma, kullanıcıyı bilgilendirip
    `transfer_to_human` ile aktar.

    Args:
        policy_number: Poliçe numarası, örn. "TR-92831".
        accident_date: Kaza tarihi, ISO format "YYYY-MM-DD".
        location: Kazanın gerçekleştiği yer (şehir/konum).
        description: Kazanın kısa açıklaması.
    """
    return await mock_client.create_claim(policy_number, accident_date, location, description)


@tool
async def get_claim_status(claim_id: str) -> dict:
    """Bir hasar dosyasının güncel durumunu getirir (OPEN, EXPERT_REVIEW,
    APPROVED, REJECTED, CLOSED).

    Args:
        claim_id: Hasar dosya numarası, örn. "CLM-98221".
    """
    return await mock_client.get_claim_status(claim_id)

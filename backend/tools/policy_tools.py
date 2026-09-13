from langchain_core.tools import tool

from . import mock_client


@tool
async def get_policy(policy_number: str) -> dict:
    """Poliçe numarasına göre poliçe bilgilerini getirir: durum (ACTIVE /
    EXPIRED / CANCELLED), araç, teminat tipi ve kapsanan kalemler.

    Bir hasar dosyası açmadan ÖNCE mutlaka bu tool ile poliçenin ACTIVE
    olduğunu doğrula.

    Args:
        policy_number: Poliçe numarası, örn. "TR-92831".
    """
    return await mock_client.get_policy(policy_number)


@tool
async def check_policy_coverage(policy_number: str, topic: str) -> dict:
    """Bir poliçenin belirli bir konuyu (teminatı) kapsayıp kapsamadığını
    kontrol eder. `topic` için örnekler: "towing"/"çekici", "theft"/"hırsızlık",
    "fire"/"yangın", "glass"/"cam", "collision"/"çarpışma".

    Args:
        policy_number: Poliçe numarası, örn. "TR-92831".
        topic: Sorulan teminat konusu (Türkçe veya İngilizce olabilir).
    """
    return await mock_client.check_coverage(policy_number, topic)

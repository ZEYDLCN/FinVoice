from langchain_core.tools import tool

from . import rag_client


@tool
async def search_policy_documents(query: str) -> list[dict]:
    """Poliçe şartları, kart sözleşmesi ve SSS gibi kurumsal dokümanlarda
    arama yapar. YALNIZCA yapılandırılmış API'lerle (get_policy,
    check_policy_coverage) cevaplanamayan, sözleşme metninin kendisini
    gerektiren sorularda kullan — örn. "ikame araç kaç gün sağlanır?",
    "deprem hasarını karşılıyor mu?", "kartımı kaybedersem ne kadar
    sorumlu olurum?". Basit teminat evet/hayır soruları için önce
    `check_policy_coverage`'ı dene.

    Args:
        query: Kullanıcının doğal dildeki sorusu.
    """
    return await rag_client.search(query, top_k=3)

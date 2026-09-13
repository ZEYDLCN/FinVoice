from langchain_core.tools import tool

# The name of this tool is special-cased in agents/graph.py: when the model
# calls it, the graph ends the turn instead of looping back for another LLM
# call, and the API layer surfaces a HandoffContext (spec §16-17) instead of
# treating this as a normal tool result.
HANDOFF_TOOL_NAME = "transfer_to_human"


@tool(HANDOFF_TOOL_NAME)
async def transfer_to_human(reason: str) -> dict:
    """Görüşmeyi bir müşteri temsilcisine aktarır. Şu durumlarda kullan:
    kullanıcı açıkça bir temsilciyle görüşmek istiyor, kullanıcının niyetini
    veya isteğini anlayamıyorsun, kritik/hassas bir işlem söz konusu
    (dolandırıcılık şüphesi, yetki gerektiren bir durum), ya da bir tool
    çağrısı başarısız oldu ve alternatif bir çözüm yok.

    Args:
        reason: Aktarımın kısa nedeni (temsilciye gösterilecek).
    """
    return {"handoff": True, "reason": reason}

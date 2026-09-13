"""Structured handoff dossier generation (Faz 7, spec §17).

When a handoff happens — whether triggered by `guardrails.py` (no LLM call
made this turn) or by the model calling `transfer_to_human` — the human
agent shouldn't have to re-read the raw transcript. This makes one extra,
focused LLM call asking the model to turn the conversation into the
structured block from spec §17 (customer, intent, policy, collected data,
sentiment, one-line summary).
"""
from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, Field

HANDOFF_SUMMARY_PROMPT = """\
Aşağıda bir müşteri ile FinVoice Ops sesli asistanı arasındaki görüşmenin \
dökümü var. Bu görüşme bir müşteri temsilcisine aktarılıyor. Temsilcinin \
müşteriye aynı şeyleri tekrar sordurmaması için görüşmeyi analiz edip \
yapılandırılmış bir özet çıkar. Görüşmede geçmeyen alanları boş bırak, \
bilgi uydurma.
"""


class HandoffSummary(BaseModel):
    customer_name: str | None = Field(default=None, description="Müşterinin adı, geçiyorsa")
    intent: str | None = Field(
        default=None, description="Müşterinin görüşme boyunca ne yapmak istediği (kısa ifade)"
    )
    policy_number: str | None = Field(default=None, description="Bahsi geçen poliçe numarası, varsa")
    collected_data: dict[str, str] = Field(
        default_factory=dict,
        description="Görüşme sırasında toplanan diğer bilgiler (ör. kaza tarihi, konum)",
    )
    sentiment: str = Field(
        default="Nötr",
        description="Müşterinin görünen duygu durumu, ör. Sakin, Endişeli, Sinirli",
    )
    summary: str = Field(description="1-2 cümlelik doğal dil özeti")


def _transcript(messages: list[BaseMessage]) -> str:
    lines = []
    for m in messages:
        if m.type in ("human", "ai") and isinstance(m.content, str) and m.content.strip():
            role = "Müşteri" if m.type == "human" else "Asistan"
            lines.append(f"{role}: {m.content}")
    return "\n".join(lines)


async def generate_handoff_summary(
    model: BaseChatModel, messages: list[BaseMessage], reason: str
) -> HandoffSummary:
    # Everything — including `.with_structured_output()` itself — is inside
    # the try: a handoff must never fail just because the summarization
    # step did (e.g. FINVOICE_AGENT_LLM_BACKEND=fake has no real structured-
    # output support). The human agent still gets the raw transcript either way.
    try:
        structured_model = model.with_structured_output(HandoffSummary)
        transcript = _transcript(messages)
        result = await structured_model.ainvoke(
            [
                SystemMessage(content=HANDOFF_SUMMARY_PROMPT),
                HumanMessage(content=f"Görüşme:\n{transcript}\n\nAktarım nedeni: {reason}"),
            ]
        )
        if isinstance(result, HandoffSummary):
            return result
        if isinstance(result, dict):
            return HandoffSummary(**result)
        raise ValueError(f"Unexpected structured-output result: {result!r}")
    except Exception:
        return HandoffSummary(summary="Otomatik özet oluşturulamadı.")


def format_dossier(summary: HandoffSummary, reason: str) -> str:
    """Renders the spec §17 block format as plain text (for logging / a
    temsilci CRM screen that just wants to display a string)."""
    lines = [
        f"Müşteri: {summary.customer_name or 'Bilinmiyor'}",
        f"Niyet: {summary.intent or 'Bilinmiyor'}",
        f"Poliçe: {summary.policy_number or '-'}",
    ]
    if summary.collected_data:
        lines.append("Toplanan Bilgiler:")
        lines.extend(f"  {k}: {v}" for k, v in summary.collected_data.items())
    lines.append(f"Duygu Durumu: {summary.sentiment}")
    lines.append(f"Aktarım Nedeni: {reason}")
    lines.append(f"Özet: {summary.summary}")
    return "\n".join(lines)

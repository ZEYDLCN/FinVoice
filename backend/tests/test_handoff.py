from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.handoff import HandoffSummary, format_dossier, generate_handoff_summary
from backend.llm.fake import ScriptedChatModel


async def test_generate_handoff_summary_uses_structured_output():
    dossier = HandoffSummary(
        customer_name="Zeyd Alcan",
        intent="Hasar dosyası açma",
        policy_number="TR-92831",
        collected_data={"accident_date": "2026-09-10", "location": "Istanbul"},
        sentiment="Sakin",
        summary="Müşteri kaza sonrası hasar dosyası açmak istiyor.",
    )
    model = ScriptedChatModel(structured_responses=[dossier])
    messages = [
        HumanMessage(content="Arabamla kaza yaptım."),
        AIMessage(content="Poliçe numaranızı paylaşır mısınız?"),
    ]

    result = await generate_handoff_summary(model, messages, reason="Test nedeni")

    assert result.customer_name == "Zeyd Alcan"
    assert result.policy_number == "TR-92831"
    assert result.collected_data["location"] == "Istanbul"


async def test_generate_handoff_summary_falls_back_on_error():
    model = ScriptedChatModel(structured_responses=[])  # will raise IndexError internally
    result = await generate_handoff_summary(model, [HumanMessage(content="Merhaba")], reason="X")
    assert result.summary  # got the fallback dossier, not an exception


def test_format_dossier_includes_all_fields():
    dossier = HandoffSummary(
        customer_name="Zeyd Alcan",
        intent="Hasar dosyası açma",
        policy_number="TR-92831",
        collected_data={"accident_date": "2026-09-10"},
        sentiment="Endişeli",
        summary="Kısa özet.",
    )
    text = format_dossier(dossier, reason="Poliçe aktif değil")
    assert "Zeyd Alcan" in text
    assert "TR-92831" in text
    assert "accident_date: 2026-09-10" in text
    assert "Endişeli" in text
    assert "Poliçe aktif değil" in text
    assert "Kısa özet." in text


def test_format_dossier_handles_missing_fields():
    dossier = HandoffSummary(summary="Bilinmeyen bir durum.")
    text = format_dossier(dossier, reason="Belirsiz")
    assert "Bilinmiyor" in text

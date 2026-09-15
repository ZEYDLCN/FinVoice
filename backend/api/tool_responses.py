"""Stable Turkish rendering for verified enterprise tool results."""
from __future__ import annotations

from typing import Any, Optional


POLICY_STATUS = {
    "ACTIVE": "aktif",
    "EXPIRED": "süresi dolmuş",
    "CANCELLED": "iptal edilmiş",
}

CLAIM_STATUS = {
    "OPEN": "açık",
    "EXPERT_REVIEW": "eksper incelemesinde",
    "APPROVED": "onaylandı",
    "REJECTED": "reddedildi",
    "CLOSED": "kapandı",
}

CARD_STATUS = {
    "ACTIVE": "aktif",
    "FROZEN": "donduruldu",
    "CANCELLED": "iptal edildi",
    "PENDING": "hazırlanıyor",
}

CARD_TYPE = {"CREDIT": "kredi kartı", "DEBIT": "banka kartı"}


def _last_successful(tool_log: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    for entry in reversed(tool_log):
        if entry.get("status") == "success":
            return entry
    return None


def format_verified_tool_reply(tool_log: list[dict[str, Any]]) -> Optional[str]:
    """Return a concise Turkish response for structured tool output."""
    entry = _last_successful(tool_log)
    if entry is None:
        return None

    name = entry.get("name")
    output = entry.get("output")

    if name == "get_policy" and isinstance(output, dict):
        number = output.get("policyNumber", "Poliçeniz")
        status = POLICY_STATUS.get(str(output.get("status")), str(output.get("status", "bilinmiyor")))
        dates = ""
        if output.get("startDate") and output.get("endDate"):
            dates = f" Geçerlilik tarihi: {output['startDate']} - {output['endDate']}."
        return f"{number} numaralı poliçeniz {status}.{dates}"

    if name == "check_policy_coverage" and isinstance(output, dict):
        number = output.get("policyNumber", "Poliçeniz")
        topic = output.get("topic", "sorduğunuz")
        verb = "kapsıyor" if output.get("covered") else "kapsamıyor"
        return f"{number} numaralı poliçeniz '{topic}' teminatını {verb}."

    if name in {"create_claim", "get_claim_status"} and isinstance(output, dict):
        claim_id = output.get("claimId", "Hasar dosyanız")
        status = CLAIM_STATUS.get(str(output.get("status")), str(output.get("status", "bilinmiyor")))
        if name == "create_claim":
            return f"Hasar dosyanız oluşturuldu. Dosya numaranız: {claim_id}. Durumu: {status}."
        return f"{claim_id} numaralı hasar dosyanızın durumu: {status}."

    if name == "get_cards" and isinstance(output, list):
        if not output:
            return "Bu müşteri numarasına bağlı bir kart bulunamadı."
        cards = []
        for card in output:
            if not isinstance(card, dict):
                continue
            card_type = CARD_TYPE.get(str(card.get("type")), "kart")
            status = CARD_STATUS.get(str(card.get("status")), str(card.get("status", "bilinmiyor")))
            cards.append(f"son dört hanesi {card.get('last4', 'bilinmeyen')} olan {card_type} ({status})")
        return "Kartlarınız: " + "; ".join(cards) + ". Hangi kart için işlem yapmak istiyorsunuz?"

    if name == "freeze_card" and isinstance(output, dict):
        return f"{output.get('cardId', 'Kartınız')} numaralı kartınız donduruldu."

    if name == "request_new_card" and isinstance(output, dict):
        return (
            f"Yeni kart talebiniz oluşturuldu. Kart numarası: {output.get('newCardId', 'bilinmiyor')}. "
            f"Tahmini teslim süresi {output.get('estimatedDeliveryDays', 'belirtilmeyen')} gün."
        )

    if name == "create_support_ticket" and isinstance(output, dict):
        return f"Destek kaydınız oluşturuldu. Kayıt numaranız: {output.get('ticketId', 'bilinmiyor')}."

    return None

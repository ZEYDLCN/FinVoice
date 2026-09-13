"""Deterministic, keyword-based hard handoff triggers (Faz 7, spec §16).

These run BEFORE the LLM sees the user's message at all — a "don't trust
the model's judgment here" layer, distinct from the softer triggers
(ambiguous intent, a tool call that failed with no obvious alternative,
suspected fraud) that `agents/prompts.py` asks the LLM to use its own
judgment on via the `transfer_to_human` tool. Two reasons to keep this
outside the LLM entirely:

1. Guaranteed behavior: an explicit "get me a human" or a clearly angry
   message should never depend on the model correctly noticing and acting
   on it.
2. Latency: skipping the LLM round-trip entirely for these cases helps
   toward the <1.5s response-latency target in ROADMAP.md §20.

This is intentionally narrow and keyword-based — real sentiment analysis
(tone, escalation trajectory, ...) is out of scope, see ROADMAP.md's V2
list. A known trade-off of any keyword gate: a message that merely mentions
one of these words without actually being a request/complaint (e.g. "geçen
sefer bir temsilciyle görüşmüştüm") will also trigger it. Acceptable for a
demo; a production system would want a real intent classifier here instead.
"""
import re

_EXPLICIT_HUMAN_REQUEST = re.compile(
    r"\btemsilci\w*\b|\boperat[öo]r\w*\b|\bcanlı destek\b|\bger[çc]ek bir (insan|kişi)\b"
    r"|\bins(a|a)na bağla\b",
    re.IGNORECASE,
)

_FRUSTRATION = re.compile(
    r"\brezalet\w*\b|\bberbat\b|\bsa[çc]mal[ıi]k\b|\byeter art[ıi]k\b"
    r"|\b[çc]ok k[ıi]zg[ıi]n\w*\b|\bsinir\w* bozu\w*\b|\b[şs]ikayet\w* (edece[ğg]im|olaca[ğg][ıi]m)\b"
    r"|\bavukat\w*\b|\bt[üu]ketici hakem\b|\bhukuki (i[şs]lem|yollara)\b",
    re.IGNORECASE,
)


def detect_hard_handoff_trigger(text: str) -> str | None:
    """Returns a human-readable reason if `text` matches a hard trigger,
    else None."""
    if _EXPLICIT_HUMAN_REQUEST.search(text):
        return "Kullanıcı açıkça bir müşteri temsilcisiyle görüşmek istedi"
    if _FRUSTRATION.search(text):
        return "Kullanıcının mesajında yoğun memnuniyetsizlik/öfke tespit edildi"
    return None

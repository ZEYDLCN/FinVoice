"""Text chunking for RAG ingestion.

PDF text extraction loses paragraph/blank-line structure (pypdf gives one
line per rendered text line, with no blank line between sections — verified
against this project's own generated PDFs). So instead of splitting on
blank lines, this is structure-aware for documents shaped like numbered
legal/insurance clauses ("1. Teminat Kapsamı ...") or FAQs (a question line
ending in "?" followed by its answer) — exactly the shape of
`rag/documents/*.pdf`. Text that doesn't match either heading pattern falls
back to plain sentence-window chunking, so this isn't hard-coded to one
document family.
"""
import re

_HEADING_PATTERN = re.compile(r"^\d+\.\s+\S")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _is_heading(line: str) -> bool:
    line = line.strip()
    if not line:
        return False
    if _HEADING_PATTERN.match(line):
        return True
    return line.endswith("?") and len(line) < 120


def chunk_text(text: str, chunk_size: int = 600) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    sections: list[str] = []
    starts_with_heading: list[bool] = []
    current: list[str] = []
    for line in lines:
        if _is_heading(line) and current:
            sections.append(" ".join(current).strip())
            starts_with_heading.append(_is_heading(current[0]))
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append(" ".join(current).strip())
        starts_with_heading.append(_is_heading(current[0]))

    if len(sections) <= 1:
        return _sentence_windows(" ".join(lines), chunk_size)

    # A document title line before the first heading becomes its own
    # heading-less "section" — fold it into the first real section instead
    # of emitting it as a standalone (near content-free) chunk.
    if not starts_with_heading[0]:
        sections = [f"{sections[0]} {sections[1]}".strip()] + sections[2:]

    chunks: list[str] = []
    for section in sections:
        if len(section) <= chunk_size:
            chunks.append(section)
        else:
            chunks.extend(_sentence_windows(section, chunk_size))
    return [c for c in chunks if c]


def _sentence_windows(text: str, chunk_size: int) -> list[str]:
    sentences = _SENTENCE_SPLIT.split(text)
    chunks: list[str] = []
    buffer = ""
    for sentence in sentences:
        candidate = f"{buffer} {sentence}".strip() if buffer else sentence
        if len(candidate) <= chunk_size:
            buffer = candidate
        else:
            if buffer:
                chunks.append(buffer)
            buffer = sentence
    if buffer:
        chunks.append(buffer)
    return chunks

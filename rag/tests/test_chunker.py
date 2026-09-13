from rag.ingestion.chunker import chunk_text


def test_splits_numbered_sections_into_separate_chunks():
    text = (
        "Örnek Doküman Başlığı\n"
        "1. Birinci Madde\n"
        "Birinci maddenin açıklaması burada yer alır.\n"
        "2. İkinci Madde\n"
        "İkinci maddenin açıklaması burada yer alır."
    )
    chunks = chunk_text(text)
    assert len(chunks) == 2
    assert "Birinci Madde" in chunks[0]
    assert "İkinci Madde" in chunks[1]
    # the title should be folded into the first section, not its own chunk
    assert "Örnek Doküman Başlığı" in chunks[0]


def test_splits_faq_questions_into_separate_chunks():
    text = (
        "Soru bir nedir?\n"
        "Cevap bir burada.\n"
        "Soru iki nedir?\n"
        "Cevap iki burada."
    )
    chunks = chunk_text(text)
    assert len(chunks) == 2
    assert chunks[0].startswith("Soru bir")
    assert chunks[1].startswith("Soru iki")


def test_falls_back_to_sentence_windows_without_headings():
    text = " ".join(f"Bu {i}. cümledir." for i in range(30))
    chunks = chunk_text(text, chunk_size=100)
    assert len(chunks) > 1
    assert all(len(c) <= 120 for c in chunks)  # small slack for the boundary sentence


def test_real_kasko_pdf_chunks_by_clause(documents_dir):
    from rag.ingestion.pdf_loader import extract_text

    text = extract_text(documents_dir / "kasko_sartlari.pdf")
    chunks = chunk_text(text)
    assert len(chunks) == 7  # 7 numbered clauses in kasko_sartlari.pdf
    assert any("İkame Araç" in c for c in chunks)
    assert any("Manevi Tazminat" in c for c in chunks)

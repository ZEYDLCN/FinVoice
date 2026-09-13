from rag.ingestion.pdf_loader import extract_text


def test_extracts_real_text_from_kasko_pdf(documents_dir):
    text = extract_text(documents_dir / "kasko_sartlari.pdf")
    assert "İkame Araç Hizmeti" in text
    assert "Doğal Afet" in text
    assert len(text) > 500


def test_extracts_real_text_from_kart_pdf(documents_dir):
    text = extract_text(documents_dir / "kart_sozlesmesi.pdf")
    assert "750 TL" in text
    assert "Yurt Dışı" in text

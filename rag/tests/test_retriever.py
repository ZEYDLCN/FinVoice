"""Real end-to-end retrieval test: real PDFs (rag/documents/), real
extraction, real chunking, real TF-IDF embedding, real FAISS index. No
network and no downloaded model needed — this is the one RAG test class
that runs exactly the same in this sandbox as anywhere else.
"""
from rag.embeddings.tfidf import TfidfEmbedder
from rag.retriever.retriever import PolicyRetriever


def _build_retriever(documents_dir):
    retriever = PolicyRetriever(TfidfEmbedder())
    chunk_count = retriever.build_index(documents_dir)
    return retriever, chunk_count


def test_build_index_indexes_all_documents(documents_dir):
    _, chunk_count = _build_retriever(documents_dir)
    assert chunk_count >= 7 + 5 + 5  # kasko(7) + kart(5) + sss(5) clauses/questions


def test_ikame_arac_query_hits_kasko_document(documents_dir):
    retriever, _ = _build_retriever(documents_dir)
    results = retriever.query("İkame araç hizmeti kaç gün sağlanır?", top_k=1)
    assert results
    assert results[0].source == "kasko_sartlari.pdf"
    assert "İkame Araç" in results[0].text


def test_deprem_query_hits_dogal_afet_clause(documents_dir):
    retriever, _ = _build_retriever(documents_dir)
    results = retriever.query("Deprem hasarını karşılıyor mu?", top_k=1)
    assert results
    assert results[0].source == "kasko_sartlari.pdf"
    assert "Doğal Afet" in results[0].text


def test_lost_card_query_hits_kart_document(documents_dir):
    retriever, _ = _build_retriever(documents_dir)
    results = retriever.query(
        "Kartımı kaybettim, bildirimden önce yapılan işlemlerden sorumlu muyum?", top_k=1
    )
    assert results
    assert results[0].source == "kart_sozlesmesi.pdf"
    assert "750 TL" in results[0].text


def test_query_before_build_raises():
    retriever = PolicyRetriever(TfidfEmbedder())
    try:
        retriever.query("test")
        assert False, "should have raised"
    except RuntimeError:
        pass


def test_top_k_limits_result_count(documents_dir):
    retriever, _ = _build_retriever(documents_dir)
    results = retriever.query("poliçe hasar kart", top_k=2)
    assert len(results) <= 2

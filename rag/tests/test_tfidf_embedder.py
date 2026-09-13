import numpy as np
import pytest

from rag.embeddings.tfidf import TfidfEmbedder


def test_encode_before_fit_raises():
    embedder = TfidfEmbedder()
    with pytest.raises(RuntimeError):
        embedder.encode(["test"])


def test_fit_then_encode_returns_float32_matrix():
    embedder = TfidfEmbedder()
    embedder.fit(["kedi köpek kuş", "araba bisiklet"])
    vectors = embedder.encode(["kedi köpek kuş"])
    assert vectors.dtype == np.float32
    assert vectors.shape[0] == 1
    assert vectors.shape[1] > 0


def test_similar_texts_have_higher_cosine_similarity():
    embedder = TfidfEmbedder()
    corpus = [
        "poliçe hasar kaza çekici hizmeti",
        "kart yurt dışı işlem ücreti gecikme faizi",
    ]
    embedder.fit(corpus)
    vectors = embedder.encode(corpus + ["hasar kaza çekici"])

    def cosine(a, b):
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

    query_vec = vectors[2]
    assert cosine(query_vec, vectors[0]) > cosine(query_vec, vectors[1])

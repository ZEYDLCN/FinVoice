"""Real sentence-transformers embedding. Downloads a model from Hugging
Face Hub on first use — excluded from the default `pytest` run (see
pytest.ini). Run explicitly with `pytest -m slow`.
"""
import numpy as np
import pytest

pytestmark = pytest.mark.slow


def test_real_sentence_transformer_embedding():
    from rag.embeddings.sentence_transformer import SentenceTransformerEmbedder

    embedder = SentenceTransformerEmbedder()
    vectors = embedder.encode(["kasko poliçesi hasar başvurusu"])
    assert vectors.dtype == np.float32
    assert vectors.shape[0] == 1

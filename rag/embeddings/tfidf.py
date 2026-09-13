"""TF-IDF embedder — the default backend for this RAG pipeline.

`sentence-transformers` (ROADMAP.md's original pick) pulls in torch and
downloads a model from Hugging Face Hub at runtime — the same two things
this project has avoided everywhere else (voice/ has no torch; the sandbox
this project was built in blocks huggingface.co, see voice/README.md and
backend/README.md). TF-IDF needs neither: it's pure scikit-learn, fits on
this project's own small, fixed document corpus, and for short, terminology-
heavy text like insurance clauses ("ikame araç", "hasarsızlık indirimi") it
does at least as well as generic sentence embeddings at exact-term
retrieval. See `embeddings/sentence_transformer.py` for the optional,
semantic alternative.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


class TfidfEmbedder:
    """Character n-gram TF-IDF, not word n-gram.

    Turkish is agglutinative (kart / kartımı / kartından / kartlar all share
    the root "kart" but not a word token) — plain word-level TF-IDF misses
    these matches entirely unless the query happens to use the exact
    inflected form the document uses. Character n-grams (3-5 chars) capture
    the shared root substring regardless of suffix, which is a standard,
    stemmer-free way to get decent lexical recall on morphologically rich
    languages. Verified in this repo's tests against real (inflected)
    Turkish queries — see tests/test_retriever.py.
    """

    def __init__(self):
        self._vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
        self._fitted = False

    def fit(self, corpus: list[str]) -> None:
        self._vectorizer.fit(corpus)
        self._fitted = True

    def encode(self, texts: list[str]) -> np.ndarray:
        if not self._fitted:
            raise RuntimeError("TfidfEmbedder.fit(corpus) must be called before encode()")
        return self._vectorizer.transform(texts).toarray().astype(np.float32)

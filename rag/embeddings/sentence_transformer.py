"""Optional semantic embedding backend using sentence-transformers.

Not used by default (see tfidf.py for why) — this exists for anyone running
FinVoice Ops with Hugging Face access who wants semantic (not just lexical)
similarity. Pulls in torch + downloads a model on first use.
"""
import numpy as np


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name)

    def fit(self, corpus: list[str]) -> None:
        pass  # pretrained — nothing to fit

    def encode(self, texts: list[str]) -> np.ndarray:
        return np.asarray(self._model.encode(texts), dtype=np.float32)

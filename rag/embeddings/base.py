from typing import Protocol

import numpy as np


class Embedder(Protocol):
    """`fit` is a no-op for pretrained embedders (sentence-transformers);
    TF-IDF needs it to build its vocabulary from the corpus before any
    `encode` call, query included."""

    def fit(self, corpus: list[str]) -> None: ...

    def encode(self, texts: list[str]) -> np.ndarray: ...

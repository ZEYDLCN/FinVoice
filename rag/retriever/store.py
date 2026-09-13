"""FAISS-backed vector store — flat index, cosine similarity via L2-normalized
inner product. Fine for this project's scale (a handful of documents, at
most a few hundred chunks); an IVF/HNSW index would only matter at a corpus
size this project's demo documents don't come close to."""
import faiss
import numpy as np

from .models import Chunk, SearchResult


class FaissVectorStore:
    def __init__(self, dim: int):
        self.dim = dim
        self.index = faiss.IndexFlatIP(dim)
        self.chunks: list[Chunk] = []

    def add(self, vectors: np.ndarray, chunks: list[Chunk]) -> None:
        if len(chunks) != vectors.shape[0]:
            raise ValueError("vectors and chunks must have the same length")
        vectors = np.ascontiguousarray(vectors, dtype=np.float32)
        faiss.normalize_L2(vectors)
        self.index.add(vectors)
        self.chunks.extend(chunks)

    def search(self, query_vector: np.ndarray, top_k: int = 3) -> list[SearchResult]:
        if self.index.ntotal == 0:
            return []
        query_vector = np.ascontiguousarray(query_vector, dtype=np.float32)
        faiss.normalize_L2(query_vector)
        scores, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            chunk = self.chunks[idx]
            results.append(SearchResult(text=chunk.text, source=chunk.source, score=float(score)))
        return results

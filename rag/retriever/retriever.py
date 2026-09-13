"""Ties ingestion (PDF -> chunks), embedding, and the FAISS store together
— the "PDF -> Text Extraction -> Chunking -> Embedding -> Vector Database
-> Retriever" pipeline from the FinVoice Ops spec (§13)."""
from pathlib import Path

from rag.embeddings.base import Embedder
from rag.ingestion.chunker import chunk_text
from rag.ingestion.pdf_loader import extract_text

from .models import Chunk, SearchResult
from .store import FaissVectorStore


class PolicyRetriever:
    def __init__(self, embedder: Embedder):
        self.embedder = embedder
        self.store: FaissVectorStore | None = None

    def build_index(self, documents_dir: Path) -> int:
        """Indexes every PDF in `documents_dir`. Returns the chunk count."""
        chunks: list[Chunk] = []
        for pdf_path in sorted(Path(documents_dir).glob("*.pdf")):
            text = extract_text(pdf_path)
            for chunk_text_value in chunk_text(text):
                chunks.append(Chunk(text=chunk_text_value, source=pdf_path.name))

        if not chunks:
            raise ValueError(f"No PDF documents found in {documents_dir}")

        self.embedder.fit([c.text for c in chunks])
        vectors = self.embedder.encode([c.text for c in chunks])
        self.store = FaissVectorStore(dim=vectors.shape[1])
        self.store.add(vectors, chunks)
        return len(chunks)

    def query(self, question: str, top_k: int = 3) -> list[SearchResult]:
        if self.store is None:
            raise RuntimeError("Index not built yet — call build_index() first")
        query_vector = self.embedder.encode([question])
        return self.store.search(query_vector, top_k=top_k)

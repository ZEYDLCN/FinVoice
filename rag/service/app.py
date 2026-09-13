"""RAG service — Faz 6.

Indexes the policy/product PDFs in `rag/documents/` at first use and
answers similarity search queries over them. This service does NOT call an
LLM — it only retrieves relevant text chunks; synthesizing those into a
natural-language answer is the agent's job (backend/, Faz 4), via the
`search_policy_documents` tool added in this phase.
"""
from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from rag.embeddings.base import Embedder
from rag.retriever.retriever import PolicyRetriever
from rag.service.config import Settings, get_settings

app = FastAPI(
    title="FinVoice Ops — RAG Service",
    version="0.1.0",
    description="PDF ingestion + FAISS retrieval over policy/product documents (Faz 6).",
)


class SearchRequest(BaseModel):
    query: str
    topK: int | None = None


class SearchResultOut(BaseModel):
    text: str
    source: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResultOut]


def _build_embedder(settings: Settings) -> Embedder:
    if settings.embedding_backend == "sentence-transformers":
        from rag.embeddings.sentence_transformer import SentenceTransformerEmbedder

        return SentenceTransformerEmbedder(settings.sentence_transformer_model)
    from rag.embeddings.tfidf import TfidfEmbedder

    return TfidfEmbedder()


@lru_cache
def get_retriever() -> PolicyRetriever:
    settings = get_settings()
    retriever = PolicyRetriever(_build_embedder(settings))
    retriever.build_index(settings.documents_dir)
    return retriever


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/search", response_model=SearchResponse)
def search(
    req: SearchRequest,
    settings: Settings = Depends(get_settings),
    retriever: PolicyRetriever = Depends(get_retriever),
):
    top_k = req.topK or settings.top_k
    results = retriever.query(req.query, top_k=top_k)
    return SearchResponse(results=[SearchResultOut(**r.__dict__) for r in results])

"""Async HTTP client for the RAG service (Faz 6)."""
from __future__ import annotations

import os

import httpx

RAG_SERVICE_URL = os.environ.get("RAG_SERVICE_URL", "http://localhost:8300")


async def search(query: str, top_k: int = 3) -> list[dict]:
    async with httpx.AsyncClient(base_url=RAG_SERVICE_URL, timeout=10.0) as client:
        resp = await client.post("/v1/search", json={"query": query, "topK": top_k})
        resp.raise_for_status()
        return resp.json()["results"]

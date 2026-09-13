from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DOCUMENTS_DIR = Path(__file__).parent.parent / "documents"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FINVOICE_RAG_")

    # "sentence-transformers" pulls in torch + downloads a model from
    # Hugging Face Hub on first use — see embeddings/tfidf.py for why
    # "tfidf" is the default.
    embedding_backend: str = "tfidf"
    sentence_transformer_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    documents_dir: str = str(DEFAULT_DOCUMENTS_DIR)
    top_k: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()

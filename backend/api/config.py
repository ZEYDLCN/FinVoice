from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FINVOICE_AGENT_")

    # "fake" runs without any LLM — see llm/fake.py's StaticReplyChatModel.
    llm_backend: str = "ollama"
    ollama_host: str = "http://localhost:11434"
    agent_model: str = "qwen3:1.7b"
    agent_temperature: float = 0.2


@lru_cache
def get_settings() -> Settings:
    return Settings()

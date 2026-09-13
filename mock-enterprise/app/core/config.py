"""Application configuration for the mock-enterprise service."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FINVOICE_")

    app_name: str = "FinVoice Ops — Mock Enterprise API"
    api_prefix: str = "/api"
    version: str = "0.1.0"


@lru_cache
def get_settings() -> Settings:
    return Settings()

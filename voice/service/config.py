from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FINVOICE_VOICE_")

    # "fake" avoids downloading/loading a real Whisper model — used by
    # default in tests/CI. Set to "faster-whisper" for real transcription.
    stt_backend: str = "faster-whisper"
    whisper_model: str = "tiny"
    whisper_language: str | None = None  # None = auto-detect

    vad_threshold: float = 0.5
    vad_min_speech_duration_ms: int = 250
    vad_min_silence_duration_ms: int = 100
    vad_speech_pad_ms: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()

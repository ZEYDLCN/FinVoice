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

    # "fake" avoids loading a real Piper voice model — used by default in
    # tests/CI. Set to "piper" + a real piper_voice_path for real TTS.
    tts_backend: str = "piper"
    piper_voice_path: str = "voice/tts/models/tr_TR-dfki-medium.onnx"


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""Prometheus metrics (Faz 8) — the per-stage latency numbers ROADMAP.md
§20 wants, as real histograms instead of just response headers."""
from prometheus_client import Counter, Histogram

VAD_LATENCY_SECONDS = Histogram(
    "finvoice_voice_vad_latency_seconds", "Silero VAD çalışma süresi"
)
STT_LATENCY_SECONDS = Histogram(
    "finvoice_voice_stt_latency_seconds", "faster-whisper transcription süresi"
)
TTS_LATENCY_SECONDS = Histogram(
    "finvoice_voice_tts_latency_seconds", "Piper sentezleme süresi"
)
TRANSCRIPTIONS_TOTAL = Counter(
    "finvoice_voice_transcriptions_total",
    "İşlenen /v1/transcribe isteği sayısı",
    ["speech_detected"],
)

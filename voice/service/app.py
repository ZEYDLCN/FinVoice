"""Voice Gateway service — Faz 3 (VAD + STT) & Faz 5 (TTS).

POST /v1/transcribe accepts an audio file (any format PyAV can decode:
wav, webm/opus from a browser MediaRecorder, ogg, mp3, ...), runs it
through Silero VAD to find the speech segment, trims silence, then
transcribes the trimmed audio with faster-whisper. Returns the transcript
plus per-stage latency so the numbers in ROADMAP.md §20 (Latency
Monitoring) have somewhere real to come from.

POST /v1/synthesize takes text and returns synthesized speech (WAV) via
Piper, completing the other half of the Mic -> VAD -> STT -> Agent -> TTS
-> Speaker loop from ROADMAP.md's architecture diagram.
"""
from __future__ import annotations

import time
from functools import lru_cache

from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from voice.audio_utils import load_audio_mono16k
from voice.service.config import Settings, get_settings
from voice.stt.transcriber import FakeTranscriber, FasterWhisperTranscriber, Transcriber
from voice.tts.synthesizer import FakeSynthesizer, PiperSynthesizer, Synthesizer
from voice.vad.segmenter import get_speech_timestamps
from voice.vad.silero import SileroVadModel

app = FastAPI(
    title="FinVoice Ops — Voice Gateway",
    version="0.2.0",
    description="Silero VAD + faster-whisper STT (Faz 3) + Piper TTS (Faz 5).",
)


class SynthesizeRequest(BaseModel):
    text: str


@lru_cache
def get_vad_model() -> SileroVadModel:
    return SileroVadModel()


@lru_cache
def get_transcriber() -> Transcriber:
    settings = get_settings()
    if settings.stt_backend == "fake":
        return FakeTranscriber()
    return FasterWhisperTranscriber(
        model_size=settings.whisper_model, language=settings.whisper_language
    )


@lru_cache
def get_synthesizer() -> Synthesizer:
    settings = get_settings()
    if settings.tts_backend == "fake":
        return FakeSynthesizer()
    return PiperSynthesizer(settings.piper_voice_path)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    vad_model: SileroVadModel = Depends(get_vad_model),
    transcriber: Transcriber = Depends(get_transcriber),
):
    raw = await file.read()
    audio = load_audio_mono16k(raw)

    vad_start = time.perf_counter()
    segments = get_speech_timestamps(
        audio,
        vad_model,
        threshold=settings.vad_threshold,
        min_speech_duration_ms=settings.vad_min_speech_duration_ms,
        min_silence_duration_ms=settings.vad_min_silence_duration_ms,
        speech_pad_ms=settings.vad_speech_pad_ms,
    )
    vad_latency_ms = round((time.perf_counter() - vad_start) * 1000)

    if not segments:
        return {
            "text": "",
            "language": None,
            "vadSegments": [],
            "vadLatencyMs": vad_latency_ms,
            "sttLatencyMs": 0,
            "totalLatencyMs": vad_latency_ms,
            "note": "Konuşma algılanamadı (VAD hiçbir segment bulamadı).",
        }

    start_sample = int(segments[0].start_ms / 1000 * 16000)
    end_sample = int(segments[-1].end_ms / 1000 * 16000)
    trimmed = audio[start_sample:end_sample]

    stt_start = time.perf_counter()
    result = transcriber.transcribe(trimmed)
    stt_latency_ms = round((time.perf_counter() - stt_start) * 1000)

    return {
        "text": result.text,
        "language": result.language,
        "vadSegments": [{"startMs": s.start_ms, "endMs": s.end_ms} for s in segments],
        "vadLatencyMs": vad_latency_ms,
        "sttLatencyMs": stt_latency_ms,
        "totalLatencyMs": vad_latency_ms + stt_latency_ms,
    }


@app.post("/v1/synthesize")
async def synthesize(
    req: SynthesizeRequest, synthesizer: Synthesizer = Depends(get_synthesizer)
):
    start = time.perf_counter()
    result = synthesizer.synthesize(req.text)
    latency_ms = round((time.perf_counter() - start) * 1000)

    return Response(
        content=result.audio_wav,
        media_type="audio/wav",
        headers={
            "X-TTS-Latency-Ms": str(latency_ms),
            "X-TTS-Duration-S": str(round(result.duration_s, 3)),
        },
    )

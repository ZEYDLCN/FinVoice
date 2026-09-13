"""Speech-to-text via faster-whisper (CTranslate2 backend — no torch)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np


@dataclass
class TranscriptionResult:
    text: str
    language: str | None
    duration_s: float


class Transcriber(Protocol):
    def transcribe(self, audio: np.ndarray) -> TranscriptionResult: ...


class FasterWhisperTranscriber:
    """Lazily loads a faster-whisper model on first use.

    `model_size` accepts any faster-whisper/CTranslate2 model name or local
    path (e.g. "tiny", "base", "small"). Larger models are more accurate but
    slower — pick per the latency budget in ROADMAP.md (§20 target <1.5s
    total response latency).
    """

    def __init__(
        self,
        model_size: str = "tiny",
        device: str = "cpu",
        compute_type: str = "int8",
        language: str | None = None,
    ):
        from faster_whisper import WhisperModel

        self._model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self._language = language

    def transcribe(self, audio: np.ndarray) -> TranscriptionResult:
        segments, info = self._model.transcribe(
            audio, language=self._language, beam_size=1, vad_filter=False
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return TranscriptionResult(
            text=text, language=info.language, duration_s=info.duration
        )


class FakeTranscriber:
    """Deterministic stand-in for tests / offline development — returns a
    canned transcript instead of loading a real (multi-MB, downloaded)
    Whisper model."""

    def __init__(self, canned_text: str = "test transcript"):
        self.canned_text = canned_text

    def transcribe(self, audio: np.ndarray) -> TranscriptionResult:
        return TranscriptionResult(
            text=self.canned_text, language="tr", duration_s=len(audio) / 16000
        )

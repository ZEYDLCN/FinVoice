"""Text-to-speech via Piper (local, self-hosted, no torch).

`piper-tts` bundles its own espeak-ng phonemizer and onnxruntime-based
vocoder — the only external input needed is a voice model file (`*.onnx` +
`*.onnx.json`), which is NOT vendored into this repo (tens of MB; see
`voice/tts/models/README.md` for how to fetch one).
"""
from __future__ import annotations

import io
import wave
from dataclasses import dataclass
from typing import Protocol


@dataclass
class SynthesisResult:
    audio_wav: bytes
    sample_rate: int
    duration_s: float


class Synthesizer(Protocol):
    def synthesize(self, text: str) -> SynthesisResult: ...


class PiperSynthesizer:
    """Loads a Piper voice model once and reuses it for every call."""

    def __init__(self, model_path: str):
        from piper import PiperVoice

        self._voice = PiperVoice.load(model_path)

    def synthesize(self, text: str) -> SynthesisResult:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            self._voice.synthesize_wav(text, wav_file)
        audio_bytes = buffer.getvalue()

        with wave.open(io.BytesIO(audio_bytes)) as wav_file:
            sample_rate = wav_file.getframerate()
            duration_s = wav_file.getnframes() / sample_rate

        return SynthesisResult(audio_wav=audio_bytes, sample_rate=sample_rate, duration_s=duration_s)


class FakeSynthesizer:
    """Deterministic stand-in for tests/offline dev — returns a short
    silent WAV instead of loading a real (tens-of-MB) voice model."""

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def synthesize(self, text: str) -> SynthesisResult:
        duration_s = max(0.3, len(text) / 15)  # rough chars-per-second guess
        num_samples = int(duration_s * self.sample_rate)

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(b"\x00\x00" * num_samples)

        return SynthesisResult(
            audio_wav=buffer.getvalue(), sample_rate=self.sample_rate, duration_s=duration_s
        )

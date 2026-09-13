"""Audio decoding helpers shared by the VAD and STT stages.

Uses PyAV (already pulled in transitively by faster-whisper, which depends
on `av`) instead of shelling out to an `ffmpeg` binary. This lets the voice
gateway accept whatever format a real browser microphone actually produces
(webm/opus from MediaRecorder, wav, ogg, ...) and normalize it to the mono
16kHz float32 PCM that both the Silero VAD model and faster-whisper expect.
"""
from __future__ import annotations

import io
from typing import BinaryIO

import av
import numpy as np

TARGET_SAMPLE_RATE = 16000


def load_audio_mono16k(source: BinaryIO | bytes) -> np.ndarray:
    """Decodes any audio container/codec PyAV understands into mono
    float32 PCM at 16kHz, normalized to [-1, 1]."""
    if isinstance(source, (bytes, bytearray)):
        source = io.BytesIO(source)

    container = av.open(source)
    try:
        stream = container.streams.audio[0]
        resampler = av.AudioResampler(format="s16", layout="mono", rate=TARGET_SAMPLE_RATE)

        chunks: list[np.ndarray] = []
        for frame in container.decode(stream):
            for resampled in resampler.resample(frame):
                chunks.append(resampled.to_ndarray())
        for resampled in resampler.resample(None):  # flush
            chunks.append(resampled.to_ndarray())
    finally:
        container.close()

    if not chunks:
        return np.zeros(0, dtype=np.float32)

    pcm16 = np.concatenate(chunks, axis=1).reshape(-1)
    return (pcm16.astype(np.float32) / 32768.0).clip(-1.0, 1.0)

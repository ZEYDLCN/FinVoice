"""Speech-segment extraction on top of `SileroVadModel`.

A from-scratch, simplified port of Silero VAD's `get_speech_timestamps`
(MIT licensed, github.com/snakers4/silero-vad). Simplified for FinVoice
Ops's use case — short, single-turn voice commands rather than long-form
audio — by dropping the upstream `max_speech_duration_s` splitting logic
(which exists to chop up multi-minute recordings).
"""
from dataclasses import dataclass

import numpy as np

from .silero import SAMPLE_RATE, WINDOW_SAMPLES, SileroVadModel


@dataclass
class SpeechSegment:
    start_ms: int
    end_ms: int


def get_speech_timestamps(
    audio: np.ndarray,
    model: SileroVadModel,
    threshold: float = 0.5,
    min_speech_duration_ms: int = 250,
    min_silence_duration_ms: int = 100,
    speech_pad_ms: int = 30,
) -> list[SpeechSegment]:
    """Runs the model over `audio` (mono float32 @ 16kHz) and returns the
    speech segments found, in milliseconds from the start of the clip."""
    model.reset_states()
    neg_threshold = max(threshold - 0.15, 0.01)
    min_speech_samples = SAMPLE_RATE * min_speech_duration_ms / 1000
    min_silence_samples = SAMPLE_RATE * min_silence_duration_ms / 1000
    speech_pad_samples = SAMPLE_RATE * speech_pad_ms / 1000

    padded_len = int(np.ceil(len(audio) / WINDOW_SAMPLES)) * WINDOW_SAMPLES
    padded = np.zeros(padded_len, dtype=np.float32)
    padded[: len(audio)] = audio

    probs = [
        model(padded[start : start + WINDOW_SAMPLES])
        for start in range(0, padded_len, WINDOW_SAMPLES)
    ]

    triggered = False
    temp_end = 0
    speeches: list[dict] = []
    current: dict = {}

    for i, prob in enumerate(probs):
        cur_sample = i * WINDOW_SAMPLES

        if prob >= threshold and temp_end:
            temp_end = 0

        if prob >= threshold and not triggered:
            triggered = True
            current["start"] = cur_sample
            continue

        if prob < neg_threshold and triggered:
            if not temp_end:
                temp_end = cur_sample
            if cur_sample - temp_end < min_silence_samples:
                continue
            current["end"] = temp_end
            if current["end"] - current["start"] > min_speech_samples:
                speeches.append(current)
            current = {}
            triggered = False
            temp_end = 0

    if current and (len(audio) - current["start"]) > min_speech_samples:
        current["end"] = len(audio)
        speeches.append(current)

    for i, sp in enumerate(speeches):
        if i == 0:
            sp["start"] = int(max(0, sp["start"] - speech_pad_samples))
        if i != len(speeches) - 1:
            gap = speeches[i + 1]["start"] - sp["end"]
            if gap < 2 * speech_pad_samples:
                sp["end"] += int(gap // 2)
                speeches[i + 1]["start"] = int(max(0, speeches[i + 1]["start"] - gap // 2))
            else:
                sp["end"] = int(min(len(audio), sp["end"] + speech_pad_samples))
                speeches[i + 1]["start"] = int(max(0, speeches[i + 1]["start"] - speech_pad_samples))
        else:
            sp["end"] = int(min(len(audio), sp["end"] + speech_pad_samples))

    return [
        SpeechSegment(
            start_ms=round(sp["start"] / SAMPLE_RATE * 1000),
            end_ms=round(sp["end"] / SAMPLE_RATE * 1000),
        )
        for sp in speeches
    ]

"""Real faster-whisper inference. Downloads the "tiny" CTranslate2 model
from Hugging Face Hub on first run (~75MB) — excluded from the default
`pytest` run (see pytest.ini). Run explicitly with `pytest -m slow`.
"""
import pytest

from voice.audio_utils import load_audio_mono16k
from voice.stt.transcriber import FasterWhisperTranscriber
from voice.vad.segmenter import get_speech_timestamps
from voice.vad.silero import SileroVadModel

pytestmark = pytest.mark.slow


def test_real_transcription_matches_synthesized_speech(sample_speech_wav):
    audio = load_audio_mono16k(sample_speech_wav)
    segments = get_speech_timestamps(audio, SileroVadModel())
    assert segments, "VAD should have found the synthesized utterance"

    start = int(segments[0].start_ms / 1000 * 16000)
    end = int(segments[-1].end_ms / 1000 * 16000)
    trimmed = audio[start:end]

    transcriber = FasterWhisperTranscriber(model_size="tiny", language="en")
    result = transcriber.transcribe(trimmed)

    # fixture was generated with:
    #   espeak-ng -v en "Policy number TR nine two eight three one is active"
    text = result.text.lower()
    assert "policy" in text
    assert "active" in text

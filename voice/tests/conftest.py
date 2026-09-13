from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_speech_wav() -> bytes:
    """A short synthesized (espeak-ng) English utterance — real formants/
    pitch, not noise, so Silero VAD should reliably flag it as speech."""
    return (FIXTURES_DIR / "sample_en.wav").read_bytes()


@pytest.fixture
def silence_wav() -> bytes:
    return (FIXTURES_DIR / "silence.wav").read_bytes()

import tarfile
import urllib.request
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"
CACHE_DIR = Path(__file__).parent.parent / ".piper_cache"
PIPER_VOICE_URL = (
    "https://github.com/rhasspy/piper/releases/download/v0.0.2/"
    "voice-en-us-lessac-low.tar.gz"
)


@pytest.fixture
def sample_speech_wav() -> bytes:
    """A short synthesized (espeak-ng) English utterance — real formants/
    pitch, not noise, so Silero VAD should reliably flag it as speech."""
    return (FIXTURES_DIR / "sample_en.wav").read_bytes()


@pytest.fixture
def silence_wav() -> bytes:
    return (FIXTURES_DIR / "silence.wav").read_bytes()


@pytest.fixture(scope="session")
def piper_voice_path() -> str:
    """Downloads (and caches under voice/.piper_cache/, gitignored) a small
    Piper voice model for the @pytest.mark.slow real-TTS tests. Fetched from
    a GitHub release rather than Hugging Face — see voice/tts/models/README.md
    for why. Skips the test (rather than failing) if the network is
    unavailable, since this is an environment concern, not a code bug."""
    model_path = CACHE_DIR / "en-us-lessac-low.onnx"
    config_path = CACHE_DIR / "en-us-lessac-low.onnx.json"

    if not (model_path.exists() and config_path.exists()):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        archive_path = CACHE_DIR / "voice.tar.gz"
        try:
            urllib.request.urlretrieve(PIPER_VOICE_URL, archive_path)
            with tarfile.open(archive_path) as tar:
                tar.extractall(CACHE_DIR)
        except OSError as exc:
            pytest.skip(f"Piper ses modeli indirilemedi (ağ erişimi yok?): {exc}")
        finally:
            archive_path.unlink(missing_ok=True)

    return str(model_path)

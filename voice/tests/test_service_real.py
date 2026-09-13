"""End-to-end service test with the real faster-whisper backend. Excluded
from the default `pytest` run — see pytest.ini. Run with `pytest -m slow`.
"""
import pytest
from fastapi.testclient import TestClient

from voice.service.app import app, get_transcriber
from voice.stt.transcriber import FasterWhisperTranscriber

pytestmark = pytest.mark.slow


@pytest.fixture
def real_client():
    app.dependency_overrides[get_transcriber] = lambda: FasterWhisperTranscriber(
        model_size="tiny", language="en"
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_transcribe_real_pipeline(real_client, sample_speech_wav):
    resp = real_client.post(
        "/v1/transcribe",
        files={"file": ("sample.wav", sample_speech_wav, "audio/wav")},
    )
    assert resp.status_code == 200
    body = resp.json()
    text = body["text"].lower()
    assert "policy" in text
    assert "active" in text
    assert body["totalLatencyMs"] > 0

"""End-to-end service tests with real backends (real faster-whisper, real
Piper). Excluded from the default `pytest` run — see pytest.ini. Run
explicitly with `pytest -m slow`.
"""
import wave
from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from voice.service.app import app, get_synthesizer, get_transcriber
from voice.stt.transcriber import FasterWhisperTranscriber
from voice.tts.synthesizer import PiperSynthesizer

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


def test_synthesize_real_pipeline(piper_voice_path):
    app.dependency_overrides[get_synthesizer] = lambda: PiperSynthesizer(piper_voice_path)
    try:
        client = TestClient(app)
        resp = client.post("/v1/synthesize", json={"text": "Your claim has been created."})
        assert resp.status_code == 200
        assert float(resp.headers["X-TTS-Duration-S"]) > 0.5
        with wave.open(BytesIO(resp.content)) as wav_file:
            assert wav_file.getnframes() > 0
    finally:
        app.dependency_overrides.clear()

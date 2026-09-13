import wave
from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from voice.service.app import app, get_synthesizer, get_transcriber
from voice.stt.transcriber import FakeTranscriber
from voice.tts.synthesizer import FakeSynthesizer


@pytest.fixture
def client():
    app.dependency_overrides[get_transcriber] = lambda: FakeTranscriber("hasar dosyası açmak istiyorum")
    app.dependency_overrides[get_synthesizer] = lambda: FakeSynthesizer()
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_transcribe_speech(client, sample_speech_wav):
    resp = client.post(
        "/v1/transcribe",
        files={"file": ("sample.wav", sample_speech_wav, "audio/wav")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["text"] == "hasar dosyası açmak istiyorum"
    assert len(body["vadSegments"]) >= 1
    assert body["vadLatencyMs"] >= 0
    assert body["sttLatencyMs"] >= 0
    assert body["totalLatencyMs"] == body["vadLatencyMs"] + body["sttLatencyMs"]


def test_transcribe_silence_skips_stt(client, silence_wav):
    resp = client.post(
        "/v1/transcribe",
        files={"file": ("silence.wav", silence_wav, "audio/wav")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["text"] == ""
    assert body["vadSegments"] == []
    assert body["sttLatencyMs"] == 0
    assert "note" in body


def test_synthesize(client):
    resp = client.post("/v1/synthesize", json={"text": "Poliçeniz aktif görünüyor."})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/wav"
    assert int(resp.headers["X-TTS-Latency-Ms"]) >= 0
    assert float(resp.headers["X-TTS-Duration-S"]) > 0

    with wave.open(BytesIO(resp.content)) as wav_file:
        assert wav_file.getnchannels() == 1

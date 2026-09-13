import numpy as np

from voice.stt.transcriber import FakeTranscriber


def test_fake_transcriber_returns_canned_text():
    transcriber = FakeTranscriber(canned_text="merhaba dünya")
    audio = np.zeros(16000, dtype=np.float32)  # 1 second of silence
    result = transcriber.transcribe(audio)
    assert result.text == "merhaba dünya"
    assert result.duration_s == 1.0

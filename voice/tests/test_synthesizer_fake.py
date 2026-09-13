import wave
from io import BytesIO

from voice.tts.synthesizer import FakeSynthesizer


def test_fake_synthesizer_returns_valid_wav():
    synth = FakeSynthesizer(sample_rate=16000)
    result = synth.synthesize("Poliçeniz aktif görünüyor.")

    assert result.sample_rate == 16000
    assert result.duration_s > 0

    with wave.open(BytesIO(result.audio_wav)) as wav_file:
        assert wav_file.getframerate() == 16000
        assert wav_file.getnchannels() == 1


def test_fake_synthesizer_duration_scales_with_text_length():
    synth = FakeSynthesizer()
    short = synth.synthesize("Merhaba.")
    long = synth.synthesize("Bu çok daha uzun bir cümle, dolayısıyla süresi de daha uzun olmalı.")
    assert long.duration_s > short.duration_s

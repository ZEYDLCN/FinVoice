import numpy as np

from voice.audio_utils import TARGET_SAMPLE_RATE, load_audio_mono16k


def test_decodes_and_resamples_to_16k_mono(sample_speech_wav):
    audio = load_audio_mono16k(sample_speech_wav)
    assert audio.dtype == np.float32
    assert audio.ndim == 1
    assert len(audio) > 0
    # source wav is ~3.5s @ 22050Hz; resampled to 16kHz should land close to that
    duration_s = len(audio) / TARGET_SAMPLE_RATE
    assert 2.5 < duration_s < 5.0
    assert np.max(np.abs(audio)) <= 1.0


def test_silence_decodes_to_near_zero_signal(silence_wav):
    audio = load_audio_mono16k(silence_wav)
    assert len(audio) > 0
    assert np.max(np.abs(audio)) < 0.01

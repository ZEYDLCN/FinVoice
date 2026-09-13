from voice.audio_utils import load_audio_mono16k
from voice.vad.segmenter import get_speech_timestamps
from voice.vad.silero import SileroVadModel


def test_speech_is_detected(sample_speech_wav):
    audio = load_audio_mono16k(sample_speech_wav)
    model = SileroVadModel()
    segments = get_speech_timestamps(audio, model)

    assert len(segments) >= 1
    total_speech_ms = sum(s.end_ms - s.start_ms for s in segments)
    clip_ms = len(audio) / 16000 * 1000
    # the synthesized utterance is almost entirely speech
    assert total_speech_ms > clip_ms * 0.5


def test_silence_has_no_speech_segments(silence_wav):
    audio = load_audio_mono16k(silence_wav)
    model = SileroVadModel()
    segments = get_speech_timestamps(audio, model)
    assert segments == []


def test_model_state_resets_between_calls(sample_speech_wav):
    """Reusing one model instance across independent clips shouldn't leak
    state (regression guard for the reset_states() call in the segmenter)."""
    audio = load_audio_mono16k(sample_speech_wav)
    model = SileroVadModel()

    first = get_speech_timestamps(audio, model)
    second = get_speech_timestamps(audio, model)
    assert [(s.start_ms, s.end_ms) for s in first] == [
        (s.start_ms, s.end_ms) for s in second
    ]

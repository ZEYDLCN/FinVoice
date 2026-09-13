"""Real Piper synthesis. Downloads a small English voice model on first run
(cached under voice/.piper_cache/ afterwards) — excluded from the default
`pytest` run (see pytest.ini). Run explicitly with `pytest -m slow`.
"""
import wave
from io import BytesIO

import pytest

from voice.tts.synthesizer import PiperSynthesizer

pytestmark = pytest.mark.slow


def test_real_synthesis_produces_nonsilent_audio(piper_voice_path):
    synth = PiperSynthesizer(piper_voice_path)
    result = synth.synthesize("Policy number TR nine two eight three one is active.")

    assert result.duration_s > 0.5

    with wave.open(BytesIO(result.audio_wav)) as wav_file:
        frames = wav_file.readframes(wav_file.getnframes())

    # crude non-silence check: real speech has samples well above 0
    max_amplitude = max(abs(int.from_bytes(frames[i : i + 2], "little", signed=True)) for i in range(0, len(frames), 2))
    assert max_amplitude > 1000

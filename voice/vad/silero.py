"""onnxruntime-only Silero VAD inference.

This re-implements the *inference* half of the official snakers4/silero-vad
project's `OnnxWrapper` (MIT licensed) using plain numpy + onnxruntime,
instead of the upstream package which hard-depends on torch + torchaudio
(~500MB+ just to run a ~1MB model). The vendored weights in
`models/silero_vad_16k.onnx` are the official, unmodified 16kHz-only ONNX
export — see `models/LICENSE` for the original MIT license text and
https://github.com/snakers4/silero-vad for the source project.

Model I/O contract (verified by introspecting the ONNX graph):
    input  : float32 [batch, context(64) + window(512)]
    state  : float32 [2, batch, 128]   -- recurrent state, fed back each call
    sr     : int64   scalar            -- sample rate (16000)
    output : float32 [batch, 1]        -- speech probability
    stateN : float32 [2, batch, 128]   -- updated state
"""
from pathlib import Path

import numpy as np
import onnxruntime as ort

MODEL_PATH = Path(__file__).parent / "models" / "silero_vad_16k.onnx"
SAMPLE_RATE = 16000
WINDOW_SAMPLES = 512
CONTEXT_SAMPLES = 64


class SileroVadModel:
    """Stateful wrapper around the Silero VAD ONNX graph.

    Call `reset_states()` before processing a new, independent audio stream,
    then feed exactly `WINDOW_SAMPLES` (512) samples per call — matching the
    model's training regime for 16kHz audio.
    """

    def __init__(self, model_path: Path = MODEL_PATH):
        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 1
        self._session = ort.InferenceSession(
            str(model_path), sess_options=opts, providers=["CPUExecutionProvider"]
        )
        self.reset_states()

    def reset_states(self) -> None:
        self._state = np.zeros((2, 1, 128), dtype=np.float32)
        self._context = np.zeros((1, CONTEXT_SAMPLES), dtype=np.float32)

    def __call__(self, chunk: np.ndarray) -> float:
        """Returns the speech probability (0..1) for one window of audio."""
        if chunk.shape[-1] != WINDOW_SAMPLES:
            raise ValueError(
                f"Expected {WINDOW_SAMPLES} samples per chunk, got {chunk.shape[-1]}"
            )
        x = np.concatenate(
            [self._context, chunk.reshape(1, -1).astype(np.float32)], axis=1
        )
        out, state = self._session.run(
            None,
            {
                "input": x,
                "state": self._state,
                "sr": np.array(SAMPLE_RATE, dtype=np.int64),
            },
        )
        self._state = state
        self._context = x[:, -CONTEXT_SAMPLES:]
        return float(out[0, 0])

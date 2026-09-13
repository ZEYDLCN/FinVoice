FROM python:3.12-slim

WORKDIR /app

COPY voice/requirements.txt ./voice/requirements.txt
RUN pip install --no-cache-dir -r voice/requirements.txt

COPY voice ./voice

# faster-whisper downloads its model from Hugging Face Hub on first use;
# mount a volume at /root/.cache/huggingface in production to avoid
# re-downloading on every container restart.
ENV FINVOICE_VOICE_STT_BACKEND=faster-whisper
ENV FINVOICE_VOICE_WHISPER_MODEL=tiny

# A real Piper voice model is NOT baked into the image (tens of MB, and not
# everyone wants the same voice) — mount one at the path below, or set
# FINVOICE_VOICE_TTS_BACKEND=fake to run without TTS. See
# voice/tts/models/README.md for how to fetch a voice.
ENV FINVOICE_VOICE_TTS_BACKEND=piper
ENV FINVOICE_VOICE_PIPER_VOICE_PATH=/app/voice/tts/models/en-us-lessac-low.onnx

EXPOSE 8100

CMD ["uvicorn", "voice.service.app:app", "--host", "0.0.0.0", "--port", "8100"]

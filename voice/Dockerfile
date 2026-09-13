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

EXPOSE 8100

CMD ["uvicorn", "voice.service.app:app", "--host", "0.0.0.0", "--port", "8100"]

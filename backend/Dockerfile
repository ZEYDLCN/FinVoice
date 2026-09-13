FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend

ENV MOCK_ENTERPRISE_URL=http://mock-enterprise:8000
ENV FINVOICE_AGENT_OLLAMA_HOST=http://ollama:11434
ENV FINVOICE_AGENT_AGENT_MODEL=qwen2.5:7b

EXPOSE 8200

CMD ["uvicorn", "backend.api.app:app", "--host", "0.0.0.0", "--port", "8200"]

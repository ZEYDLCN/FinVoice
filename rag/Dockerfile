FROM python:3.12-slim

WORKDIR /app

COPY rag/requirements.txt ./rag/requirements.txt
RUN pip install --no-cache-dir -r rag/requirements.txt

COPY rag ./rag

EXPOSE 8300

CMD ["uvicorn", "rag.service.app:app", "--host", "0.0.0.0", "--port", "8300"]

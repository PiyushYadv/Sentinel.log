FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# CPU-only PyTorch wheels keep the image ~1.5GB smaller than the default CUDA build
COPY requirements.txt .
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# App code, Drain3 config, template mapping and LSTM weights
COPY main.py ml_service.py drain3.ini event_templates.json event_mapping.json lstm_log_model.pth ./

RUN useradd --create-home appuser
USER appuser

# Hosts like Render inject PORT; docker-compose and local runs fall back to 8000
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ[\"PORT\"]}/api/health', timeout=4)"

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port \"$PORT\""]

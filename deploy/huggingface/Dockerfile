# Single-container image for Hugging Face Spaces (one public port: 7860).
# Next.js serves the UI on 7860 and proxies /api/* to FastAPI on 127.0.0.1:8000.
# Build context is the repository root:
#   docker build -f deploy/huggingface/Dockerfile -t sentinel-hf .

# ── Frontend build ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS node-runtime

# ── Runtime: Python (FastAPI + PyTorch) with the Node binary alongside ──────
FROM python:3.11-slim-bookworm

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# CPU-only PyTorch wheels keep the image ~1.5GB smaller than the CUDA build
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu -r /tmp/requirements.txt

# Spaces run containers as UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user
WORKDIR /home/user/app

COPY --chown=user backend/main.py backend/ml_service.py backend/drain3.ini \
     backend/event_templates.json backend/event_mapping.json backend/lstm_log_model.pth \
     backend/
COPY --chown=user --from=frontend /app/.next/standalone frontend/
COPY --chown=user --from=frontend /app/.next/static frontend/.next/static
COPY --chown=user --from=frontend /app/public frontend/public
COPY --chown=user deploy/huggingface/start.sh start.sh

EXPOSE 7860
CMD ["bash", "start.sh"]

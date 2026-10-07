#!/usr/bin/env bash
# Runs FastAPI (internal) and the Next.js server (public, port 7860) in one container.
# If either process exits, the container exits so the platform restarts it.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

(cd "$APP_DIR/backend" && exec uvicorn main:app --host 127.0.0.1 --port 8000) &

(cd "$APP_DIR/frontend" && \
  PORT="${PORT:-7860}" HOSTNAME=0.0.0.0 BACKEND_URL=http://127.0.0.1:8000 \
  exec node server.js) &

wait -n
exit $?

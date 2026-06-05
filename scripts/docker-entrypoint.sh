#!/bin/sh
set -e
LOG_LEVEL="${LOG_LEVEL:-INFO}"
UVICORN_LOG=$(printf '%s' "$LOG_LEVEL" | tr '[:upper:]' '[:lower:]')
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level "$UVICORN_LOG" --access-log

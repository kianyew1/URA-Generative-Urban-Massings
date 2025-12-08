#!/usr/bin/env bash
set -euo pipefail

# Small helper to run the FastAPI app with uvicorn.
SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

APP_MODULE="main:app"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
RELOAD="${RELOAD:-true}"

cd "$SCRIPT_DIR"

if [ -x "${ROOT_DIR}/.venv/bin/uvicorn" ]; then
  UVICORN_BIN="${ROOT_DIR}/.venv/bin/uvicorn"
elif command -v uvicorn >/dev/null 2>&1; then
  UVICORN_BIN="$(command -v uvicorn)"
else
  echo "uvicorn not found. Install with 'pip install uvicorn[standard]' in your environment." >&2
  exit 1
fi

EXTRA_ARGS=()
if [ "$RELOAD" = "true" ] || [ "$RELOAD" = "True" ] || [ "$RELOAD" = "1" ]; then
  EXTRA_ARGS+=(--reload)
fi

exec "$UVICORN_BIN" "$APP_MODULE" --host "$HOST" --port "$PORT" "${EXTRA_ARGS[@]}"

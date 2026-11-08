#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${HTML_EDITOR_PORT:-3000}"
URL="http://127.0.0.1:${PORT}/"
MODE="${HTML_EDITOR_MODE:-docker}"
HOST_SERVER_PID=""
export HTML_EDITOR_UID="$(id -u)"
export HTML_EDITOR_GID="$(id -g)"

mkdir -p "${ROOT_DIR}/projects"

wait_for_health() {
  local attempts=0
  until curl -fsS "${URL}api/health" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ "${attempts}" -ge 30 ]]; then
      echo "html_editor did not become healthy at ${URL}api/health" >&2
      return 1
    fi
    sleep 1
  done
}

start_host_mode() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "Stopping Docker editor so host mode can use port ${PORT}."
    HTML_EDITOR_PORT="${PORT}" docker compose -f "${ROOT_DIR}/docker-compose.yml" stop html_editor >/dev/null || true
  fi

  local chromium="${HTML_EDITOR_CHROMIUM_PATH:-}"
  if [[ -z "${chromium}" ]]; then
    chromium="$(command -v chromium || command -v chromium-browser || true)"
    [[ -n "${chromium}" ]] || [[ ! -x /snap/bin/chromium ]] || chromium=/snap/bin/chromium
  fi
  if [[ -n "${chromium}" ]]; then
    export HTML_EDITOR_CHROMIUM_PATH="${chromium}"
  else
    echo "Warning: Chromium was not found; authenticated capture may not launch a visible browser." >&2
  fi

  if curl -fsS "${URL}api/health" >/dev/null 2>&1; then
    echo "A server already answers on port ${PORT}; verifying it is the host editor."
  else
    echo "Starting host Node backend with visible desktop Chromium support."
    (cd "${ROOT_DIR}" && export PORT="${PORT}" HTML_EDITOR_HOST=127.0.0.1 && exec node server.mjs) > "${ROOT_DIR}/html_editor.log" 2>&1 &
    HOST_SERVER_PID=$!
  fi
  wait_for_health
  MODE="host-desktop"
}

if [[ "${MODE}" == "host" ]]; then
  start_host_mode
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Starting Docker service: html_editor"
  COMPOSE=(docker compose -f "${ROOT_DIR}/docker-compose.yml")
  if [[ "${HTML_EDITOR_REBUILD:-0}" == "1" ]] || ! docker image inspect html_editor:latest >/dev/null 2>&1; then
    echo "Building html_editor image (set HTML_EDITOR_REBUILD=0 to reuse it on later starts)."
    HTML_EDITOR_PORT="${PORT}" "${COMPOSE[@]}" build html_editor
  fi
  HTML_EDITOR_PORT="${PORT}" "${COMPOSE[@]}" up -d html_editor
  wait_for_health
  MODE="docker"
else
  echo "Docker daemon unavailable; starting the local Node backend instead."
  HTML_EDITOR_MODE=host start_host_mode
fi

echo "html_editor is running in ${MODE} mode at ${URL}"
echo "Project root: ${ROOT_DIR}/projects"
echo "Health: ${URL}api/health"
if [[ "${MODE}" == "host-desktop" ]]; then
  echo "Interactive login: enabled; Chromium opens visibly on this desktop."
  echo "Stop: press Ctrl+C in this terminal."
else
  echo "Interactive login: use host mode: HTML_EDITOR_MODE=host ./start_html_editor.sh"
  echo "Stop: docker compose -f ${ROOT_DIR}/docker-compose.yml stop html_editor"
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${URL}" >/dev/null 2>&1 || true
fi

if [[ -n "${HOST_SERVER_PID}" ]]; then
  trap 'kill -TERM "${HOST_SERVER_PID}" 2>/dev/null || true; wait "${HOST_SERVER_PID}" 2>/dev/null || true' INT TERM
  wait "${HOST_SERVER_PID}"
fi

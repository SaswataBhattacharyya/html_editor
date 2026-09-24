#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${HTML_EDITOR_PORT:-3000}"
URL="http://127.0.0.1:${PORT}/"

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

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
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
  if [[ -f "${ROOT_DIR}/.html_editor.pid" ]] && kill -0 "$(cat "${ROOT_DIR}/.html_editor.pid")" 2>/dev/null; then
    echo "Local html_editor server is already running."
  else
    (cd "${ROOT_DIR}" && PORT="${PORT}" nohup node server.mjs > "${ROOT_DIR}/html_editor.log" 2>&1 & echo $! > "${ROOT_DIR}/.html_editor.pid")
  fi
  wait_for_health
  MODE="local-node"
fi

echo "html_editor is running in ${MODE} mode at ${URL}"
echo "Project root: ${ROOT_DIR}/projects"
echo "Health: ${URL}api/health"

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${URL}" >/dev/null 2>&1 || true
fi

#!/usr/bin/env bash
# Pull prebuilt app image from GHCR and restart — no `next build` on the VPS.
# Usage (on VPS, in the compose project directory):
#   export APP_IMAGE=ghcr.io/<owner>/portmaster:latest   # lowercase
#   ./scripts/vps-pull-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_IMAGE="${APP_IMAGE:-ghcr.io/iyazibrahim/portmaster:latest}"
APP_IMAGE="$(echo "$APP_IMAGE" | tr '[:upper:]' '[:lower:]')"
export APP_IMAGE

echo "Pulling $APP_IMAGE ..."
docker compose pull app

echo "Restarting app (Postgres stays up) ..."
docker compose up -d app

echo "Pruning dangling images ..."
docker image prune -f

echo "Done. Health:"
docker compose ps app

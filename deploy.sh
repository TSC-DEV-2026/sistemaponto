#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T sistemaponto-api alembic upgrade head

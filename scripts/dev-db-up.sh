#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load env vars (DATABASE_URL, etc)
set -a
source .env
set +a

# Start containers
docker compose up -d postgres redis

# Wait until Postgres is ready
echo "Waiting for Postgres..."
until psql "$DATABASE_URL" -c "select 1" >/dev/null 2>&1; do
  sleep 0.5
done

echo "Postgres OK:"
psql "$DATABASE_URL" -c "select now();"

echo "Containers:"
docker compose ps

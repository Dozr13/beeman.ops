#!/usr/bin/env bash
set -euo pipefail

export SITE_CODE="${SITE_CODE:-Bulldog-26}"
export SUBNET="${SUBNET:-192.168.1.100-254}"
export PORT="${PORT:-4028}"

while true; do
  date
  ./scripts/poll-whatsminers-to-db.sh || echo "ingest failed (continuing)"
  sleep 180
done

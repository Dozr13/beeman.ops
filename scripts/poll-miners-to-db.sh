#!/usr/bin/env bash
set -euo pipefail

# ---- config (override via env vars when running) ----
SITE_CODE="${SITE_CODE:-Welker}"
SUBNET="${SUBNET:-192.168.1.100-254}"
PORT="${PORT:-4028}"

: "${DATABASE_URL:?DATABASE_URL is not set. Run: source ./scripts/env-prod.sh}"

command -v jq >/dev/null || { echo "jq is required"; exit 1; }
command -v nmap >/dev/null || { echo "nmap is required"; exit 1; }
command -v psql >/dev/null || { echo "psql is required"; exit 1; }

# ---- scan ----
IPS="$(
  sudo nmap -n -Pn --host-timeout 2s --max-retries 1 \
    --initial-rtt-timeout 200ms --max-rtt-timeout 800ms \
    -p "$PORT" --open "$SUBNET" \
  | awk '/Nmap scan report for/{print $5}' \
  | sort -V \
  | paste -sd' ' -
)"

if [[ -z "${IPS}" ]]; then
  echo "No miners found on $SUBNET port $PORT"
  exit 0
fi

echo "Found $(wc -w <<<"$IPS") miners: $IPS"

# ---- poll -> CSV temp file ----
tmp_csv="$(mktemp /tmp/whatsminers.XXXXXX.csv)"
trap 'rm -f "$tmp_csv"' EXIT

IPS="$IPS" ./scripts/poll-whatsminers.py \
| jq -r '[.ip, .ts, (.|del(.ip,.ts))|tostring] | @csv' \
> "$tmp_csv"

echo "Wrote CSV: $tmp_csv ($(wc -l <"$tmp_csv") rows)"

# ---- load into postgres (latest table: DeviceStatus) ----
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v site_code="$SITE_CODE" \
  -v tmp_csv="$tmp_csv" \
<<'SQL'
begin;

create temp table tmp_status (
  ip text,
  ts timestamptz,
  payload jsonb
) on commit drop;

\copy tmp_status (ip, ts, payload) from :'tmp_csv' with (format csv);

insert into "DeviceStatus" ("deviceId","ts","payload")
select
  d.id,
  (t.ts at time zone 'UTC')::timestamp(3) as ts,
  t.payload as payload
from tmp_status t
join "Site" s on s.code = :'site_code'
join "Device" d
  on d."siteId" = s.id
 and d.kind = 'MINER'
 and d."externalId" = t.ip
on conflict ("deviceId") do update
set
  "ts" = excluded."ts",
  "payload" = excluded."payload";

commit;
SQL

echo "DB upsert complete."

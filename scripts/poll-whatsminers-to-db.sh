#!/usr/bin/env bash
set -euo pipefail

: "${SITE_CODE:?Set SITE_CODE (example: Bulldog-26)}"
: "${SUBNET:?Set SUBNET (example: 192.168.1.100-254)}"
: "${PORT:=4028}"

# 1) Scan for miners (port open)
IPS="$(
  nmap -n -Pn --host-timeout 2s --max-retries 1 \
    --initial-rtt-timeout 200ms --max-rtt-timeout 800ms \
    -p "$PORT" --open "$SUBNET" \
  | awk '/Nmap scan report for/{print $5}' \
  | sort -V \
  | paste -sd' ' -
)"

echo "Found IPs:"
echo "$IPS"
echo

# Portable mktemp (works on Ubuntu + macOS)
tmp_csv="$(mktemp -p /tmp whatsminers.XXXXXX)"
trap 'rm -f "$tmp_csv"' EXIT

# 2) Poll miners -> CSV: ip, ts, payload(json)
# IMPORTANT: payload must have ghs_* keys as JSON numbers (not strings)
IPS="$IPS" ./scripts/poll-whatsminers.py \
| jq -r '[.ip, .ts, ((.|del(.ip,.ts)) | @json)] | @csv' \
> "$tmp_csv"

echo "Wrote: $tmp_csv"
echo "Lines: $(wc -l < "$tmp_csv")"
echo

# 3) Load into DB
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v site_code="$SITE_CODE" <<SQL
begin;

create temp table tmp_status (
  ip text,
  ts timestamptz,
  payload jsonb
) on commit drop;

\\copy tmp_status (ip, ts, payload) from '$tmp_csv' with (format csv);

insert into "DeviceStatus" ("deviceId","ts","payload")
select
  d.id,
  t.ts,
  t.payload
from tmp_status t
join "Site" s on s.code = :'site_code'
join "Device" d
  on d."siteId" = s.id
 and d.kind = 'MINER'
 and d.meta->>'host' = t.ip
on conflict ("deviceId") do update
set
  "ts" = excluded."ts",
  "payload" = excluded."payload";

commit;
SQL

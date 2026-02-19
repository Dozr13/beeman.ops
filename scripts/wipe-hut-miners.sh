#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HUT_CODE="${1:-}"
CONFIRM="${2:-}"

if [[ -z "$HUT_CODE" || "$CONFIRM" != "--yes" ]]; then
  echo "Usage: $0 <HUT_CODE> --yes"
  echo "Example: $0 GH180 --yes"
  exit 1
fi

# Load env
set -a
source .env
set +a
: "${DATABASE_URL:?DATABASE_URL missing (check .env)}"

# Prisma schema= breaks psql, strip it
PSQL_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//; s/\?&/\?/; s/\?$//')"
export PSQL_URL

echo "WIPING MINERS for hut: $HUT_CODE"
echo "This deletes DeviceStatus + Device rows where kind='MINER' in the hut's CURRENT assigned site."
echo ""

psql "$PSQL_URL" -c "select 1;" >/dev/null

# Show which site we will wipe + counts BEFORE
psql "$PSQL_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
),
site_info as (
  select s.id, s.code
  from hut_site hs
  join "Site" s on s.id = hs.site_id
)
select
  'site' as k,
  coalesce(si.code, 'NONE') as v
from site_info si
union all
select
  'miners_before' as k,
  count(*)::text as v
from hut_site hs
join "Device" d on d."siteId" = hs.site_id
where d.kind='MINER';
SQL

# Wipe miner DeviceStatus + Device in that site
psql "$PSQL_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
),
miner_devices as (
  select d.id
  from hut_site hs
  join "Device" d on d."siteId" = hs.site_id
  where d.kind='MINER'
),
del_status as (
  delete from "DeviceStatus"
  where "deviceId" in (select id from miner_devices)
  returning 1
),
del_devices as (
  delete from "Device"
  where id in (select id from miner_devices)
  returning 1
)
select
  (select count(*) from del_status) as deleted_device_status,
  (select count(*) from del_devices) as deleted_devices;
SQL

# Counts AFTER
psql "$PSQL_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
)
select
  count(*) as miners_after
from hut_site hs
join "Device" d on d."siteId" = hs.site_id
where d.kind='MINER';
SQL

echo ""
echo "Done."
echo "Next: run your agent/ingest so miners get recreated, then run apply-hut-mapping.sh."

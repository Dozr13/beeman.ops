#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HUT_CODE="${1:-}"
if [[ -z "$HUT_CODE" ]]; then
  echo "Usage: $0 <HUT_CODE>   (example: $0 GH180)"
  exit 1
fi

CSV_PATH="packages/ops-data/huts/${HUT_CODE}/mapping.csv"
if [[ ! -f "$CSV_PATH" ]]; then
  echo "Missing CSV: $CSV_PATH"
  exit 1
fi

# ----------------------------
# Load DATABASE_URL safely
# - Do NOT source .env (dotenv files are not bash scripts)
# - Only extract DATABASE_URL line
# ----------------------------
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ ! -f .env ]]; then
    echo "Missing .env at repo root AND DATABASE_URL not set in shell."
    exit 1
  fi

  # Support "DATABASE_URL=..." or "export DATABASE_URL=..."
  DATABASE_URL="$(
    grep -E '^(export )?DATABASE_URL=' .env | head -n 1 | sed -E 's/^(export )?DATABASE_URL=//'
  )"

  # Strip optional surrounding quotes
  DATABASE_URL="${DATABASE_URL#\"}"
  DATABASE_URL="${DATABASE_URL%\"}"
  DATABASE_URL="${DATABASE_URL#\'}"
  DATABASE_URL="${DATABASE_URL%\'}"

  if [[ -z "$DATABASE_URL" ]]; then
    echo "DATABASE_URL missing (check .env)"
    exit 1
  fi

  export DATABASE_URL
fi

: "${DATABASE_URL:?DATABASE_URL missing}"

# Build a psql-compatible URL (remove Prisma schema= query param)
PSQL_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//; s/\?&/\?/; s/\?$//')"
export PSQL_URL

echo "HUT: $HUT_CODE"
echo "CSV: $CSV_PATH"
echo "DB:  (loaded)"
echo ""

# Ensure DB reachable
psql "$PSQL_URL" -c "select 1;" >/dev/null

# ----------------------------
# 1) Staging table
# ----------------------------
psql "$PSQL_URL" <<'SQL'
drop table if exists miner_locmap_staging;
create table miner_locmap_staging (
  hutcode text not null,
  loc     text not null,
  ip      text null
);
SQL

# ----------------------------
# 2) Load CSV -> staging (safe CSV writer)
# ----------------------------
python3 - <<PY | psql "$PSQL_URL" -c "\copy miner_locmap_staging (hutcode,loc,ip) from stdin with (format csv, header true)"
import csv, sys
p = "${CSV_PATH}"
w = csv.writer(sys.stdout)
w.writerow(["hutcode","loc","ip"])
with open(p, newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        hut = (row.get("Hut") or "").strip()
        loc = (row.get("Position") or "").strip()
        ip  = (row.get("Miner IP") or "").strip()
        if not hut or not loc:
            continue
        w.writerow([hut, loc, ip])
PY

echo "Staging counts by row letter (from CSV Position):"
psql "$PSQL_URL" -c "select left(loc,1) as row, count(*) as n from miner_locmap_staging where hutcode='${HUT_CODE}' group by 1 order by 1;"

echo ""
echo "Staging rows missing Miner IP (cannot map these):"
psql "$PSQL_URL" -c "select count(*) as missing_ip from miner_locmap_staging where hutcode='${HUT_CODE}' and (ip is null or btrim(ip)='');"

echo ""
echo "Staging duplicate IPs (should be empty):"
psql "$PSQL_URL" -c "select ip, count(*) as n from miner_locmap_staging where hutcode='${HUT_CODE}' and ip is not null and btrim(ip)<>'' group by ip having count(*)>1 order by n desc, ip;"

# ----------------------------
# 3) Apply mapping to Device.meta.loc
# ----------------------------
psql "$PSQL_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code = '${HUT_CODE}'
    and ha."endsAt" is null
  limit 1
),
map as (
  select distinct on (ip)
    ip,
    loc
  from miner_locmap_staging
  where hutcode='${HUT_CODE}'
    and ip is not null and btrim(ip) <> ''
  order by ip, loc
),
dev as (
  select
    d.id as device_id,
    coalesce(
      substring(ds.payload->>'ip' from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d."externalId" from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d.name from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d.meta->>'ip' from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d.meta->>'host' from '(\\d{1,3}(?:\\.\\d{1,3}){3})')
    ) as ip,
    d.meta
  from hut_site hs
  join "Device" d on d."siteId" = hs.site_id and d.kind='MINER'
  left join "DeviceStatus" ds on ds."deviceId" = d.id
),
target as (
  select dev.device_id, map.loc
  from dev
  join map on map.ip = dev.ip
)
update "Device" d
set meta = jsonb_set(coalesce(d.meta, '{}'::jsonb), '{loc}', to_jsonb(t.loc), true)
from target t
where d.id = t.device_id;
SQL

# ----------------------------
# 4) Verify Device.meta.loc counts for this hut's assigned site
# ----------------------------
echo ""
echo "Device.meta.loc counts in assigned site:"
psql "$PSQL_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
)
select
  case
    when d.meta ? 'loc' then left(d.meta->>'loc',1)
    else '∅'
  end as row,
  count(*) as n
from hut_site hs
join "Device" d on d."siteId" = hs.site_id
where d.kind='MINER'
group by 1
order by 1;
SQL

# ----------------------------
# 5) Show present miner IPs not found in mapping
# ----------------------------
echo ""
echo "Present miner IPs (in assigned site) NOT found in mapping.csv:"
psql "$PSQL_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
),
present as (
  select distinct
    coalesce(
      substring(ds.payload->>'ip' from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d."externalId" from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d.name from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d.meta->>'ip' from '(\\d{1,3}(?:\\.\\d{1,3}){3})'),
      substring(d.meta->>'host' from '(\\d{1,3}(?:\\.\\d{1,3}){3})')
    ) as ip
  from hut_site hs
  join "Device" d on d."siteId" = hs.site_id and d.kind='MINER'
  left join "DeviceStatus" ds on ds."deviceId" = d.id
),
mapped as (
  select distinct ip
  from miner_locmap_staging
  where hutcode='${HUT_CODE}'
    and ip is not null and btrim(ip) <> ''
)
select p.ip
from present p
left join mapped m on m.ip = p.ip
where p.ip is not null
  and m.ip is null
order by p.ip;
SQL

echo ""
echo "Done."

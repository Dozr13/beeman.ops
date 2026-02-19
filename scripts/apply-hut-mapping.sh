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

# Load env vars (DATABASE_URL, etc)
set -a
source .env
set +a

echo "Using CSV: $CSV_PATH"
echo "DB: ${DATABASE_URL}"

# 0) Ensure DB reachable
psql "$DATABASE_URL" -c "select 1;" >/dev/null

# 1) Create staging table with *lowercase* columns to avoid quote-case hell forever
psql "$DATABASE_URL" <<'SQL'
drop table if exists miner_locmap_staging;
create table miner_locmap_staging (
  hutcode text not null,
  loc     text not null,
  ip      text null
);
SQL

# 2) Load CSV -> staging (reads Hut + Position + Miner IP)
python3 - <<PY | psql "$DATABASE_URL" -c "\copy miner_locmap_staging (hutcode,loc,ip) from stdin with (format csv, header true)"
import csv
p = "${CSV_PATH}"
print("hutcode,loc,ip")
with open(p, newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        hut = (row.get("Hut") or "").strip()
        loc = (row.get("Position") or "").strip()     # Axx/Bxx (THIS is what we want)
        ip  = (row.get("Miner IP") or "").strip()
        if not hut or not loc:
            continue
        print(f"{hut},{loc},{ip}")
PY

# 3) Quick sanity: A/B counts in staging (should be 24/24 for GH180)
psql "$DATABASE_URL" -c "select left(loc,1) as row, count(*) as n from miner_locmap_staging where hutcode='${HUT_CODE}' group by 1 order by 1;"

# 4) Apply mapping ONLY to miners in the CURRENT site assigned to this hut.
#    Match by DeviceStatus.payload->>'ip' == staging.ip
psql "$DATABASE_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code = '${HUT_CODE}'
    and ha."endsAt" is null
  limit 1
),
map as (
  select loc, ip
  from miner_locmap_staging
  where hutcode='${HUT_CODE}'
    and ip is not null and ip <> ''
),
target as (
  select d.id as device_id, m.loc as loc
  from hut_site hs
  join "Device" d on d."siteId" = hs.site_id and d.kind = 'MINER'
  join "DeviceStatus" ds on ds."deviceId" = d.id
  join map m on (ds.payload->>'ip') = m.ip
)
update "Device" d
set meta = jsonb_set(coalesce(d.meta, '{}'::jsonb), '{loc}', to_jsonb(t.loc), true)
from target t
where d.id = t.device_id;
SQL

# 5) Verify result for this hut’s assigned site: A/B counts from Device.meta.loc
psql "$DATABASE_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
)
select left(d.meta->>'loc',1) as row, count(*) as n
from hut_site hs
join "Device" d on d."siteId" = hs.site_id
where d.kind='MINER'
group by 1
order by 1;
SQL

# 6) Show any “present IPs” not found in mapping (this is why you see missing B sometimes)
psql "$DATABASE_URL" <<SQL
with hut_site as (
  select ha."siteId" as site_id
  from "Hut" h
  join "HutAssignment" ha on ha."hutId" = h.id
  where h.code='${HUT_CODE}' and ha."endsAt" is null
  limit 1
),
present as (
  select distinct ds.payload->>'ip' as ip
  from "DeviceStatus" ds
  join "Device" d on d.id = ds."deviceId"
  join hut_site hs on hs.site_id = d."siteId"
  where d.kind='MINER'
    and ds.payload ? 'ip'
),
mapped as (
  select ip
  from miner_locmap_staging
  where hutcode='${HUT_CODE}'
    and ip is not null and ip <> ''
)
select p.ip
from present p
left join mapped m on m.ip = p.ip
where m.ip is null
order by p.ip;
SQL

echo "Done."

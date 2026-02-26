#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HUT_CODE="${1:-}"
SITE_CODE="${2:-}"
SITE_NAME="${3:-}"

if [[ -z "$HUT_CODE" || -z "$SITE_CODE" ]]; then
  echo "Usage: $0 <HUT_CODE> <SITE_CODE> [SITE_NAME]"
  echo "Example: $0 Welker180kw WELKER \"Welker\""
  exit 1
fi

# basic safety (avoid SQL injection / weird codes)
if [[ ! "$HUT_CODE" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Bad HUT_CODE: $HUT_CODE"
  exit 1
fi
if [[ ! "$SITE_CODE" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Bad SITE_CODE: $SITE_CODE"
  exit 1
fi

CSV_PATH="packages/ops-data/huts/${HUT_CODE}/mapping.csv"
if [[ ! -f "$CSV_PATH" ]]; then
  echo "Missing CSV: $CSV_PATH"
  exit 1
fi

# ----------------------------
# Load DATABASE_URL safely
# ----------------------------
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ ! -f .env && ! -f .env.local ]]; then
    echo "Missing .env/.env.local at repo root AND DATABASE_URL not set in shell."
    exit 1
  fi
  ENV_FILE=".env.local"
  [[ -f .env.local ]] || ENV_FILE=".env"

  DATABASE_URL="$(
    grep -E '^(export )?DATABASE_URL=' "$ENV_FILE" | head -n 1 | sed -E 's/^(export )?DATABASE_URL=//'
  )"

  # Strip optional surrounding quotes
  DATABASE_URL="${DATABASE_URL#\"}"; DATABASE_URL="${DATABASE_URL%\"}"
  DATABASE_URL="${DATABASE_URL#\'}"; DATABASE_URL="${DATABASE_URL%\'}"

  if [[ -z "$DATABASE_URL" ]]; then
    echo "DATABASE_URL missing (check $ENV_FILE)"
    exit 1
  fi

  export DATABASE_URL
fi

: "${DATABASE_URL:?DATABASE_URL missing}"

# Build a psql-compatible URL (remove Prisma schema= query param)
PSQL_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//; s/\?&/\?/; s/\?$//')"

# Ensure DB reachable
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "select 1;" >/dev/null

# UUID helper (DB ids are TEXT; UUID is fine)
uuid() {
  python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
}

NEW_SITE_ID="$(uuid)"
NEW_HUT_ID="$(uuid)"
NEW_ASG_ID="$(uuid)"

echo "Onboarding:"
echo "  HUT:  $HUT_CODE"
echo "  SITE: $SITE_CODE  (${SITE_NAME:-no name})"
echo "  CSV:  $CSV_PATH"
echo ""

# ----------------------------
# 1) Upsert Site + Hut (FIXED) then assign hut -> site
# ----------------------------

SITE_ID="$(
  psql "$PSQL_URL" -X -q -v ON_ERROR_STOP=1 -At \
    -v site_id="$NEW_SITE_ID" \
    -v site_code="$SITE_CODE" \
    -v site_name="${SITE_NAME:-}" \
  <<'SQL' \
  | head -n 1 | tr -d '\r\n'
insert into "Site"(id, code, name, timezone, type)
values (:'site_id', :'site_code', nullif(:'site_name',''), 'America/Denver', 'UNKNOWN')
on conflict (code) do update
  set name = coalesce(excluded.name, "Site".name)
returning id;
SQL
)"

if [[ -z "$SITE_ID" ]]; then
  echo "ERROR: failed to upsert Site (SITE_ID empty)"
  exit 1
fi

HUT_ID="$(
  psql "$PSQL_URL" -X -q -v ON_ERROR_STOP=1 -At \
    -v hut_id="$NEW_HUT_ID" \
    -v hut_code="$HUT_CODE" \
  <<'SQL' \
  | head -n 1 | tr -d '\r\n'
insert into "Hut"(id, code, name)
values (:'hut_id', :'hut_code', :'hut_code')
on conflict (code) do update
  set name = coalesce(excluded.name, "Hut".name)
returning id;
SQL
)"

if [[ -z "$HUT_ID" ]]; then
  echo "ERROR: failed to upsert Hut (HUT_ID empty)"
  exit 1
fi

# End existing current assignment(s) for this hut, then create a new one to this site
psql "$PSQL_URL" -v ON_ERROR_STOP=1 <<SQL
update "HutAssignment"
set "endsAt" = now()
where "hutId" = '$HUT_ID' and "endsAt" is null;

insert into "HutAssignment"(id, "hutId", "siteId", "startsAt")
values ('$NEW_ASG_ID', '$HUT_ID', '$SITE_ID', now());
SQL

echo "DB OK:"
echo "  siteId=$SITE_ID"
echo "  hutId=$HUT_ID"
echo ""

# ----------------------------
# 2) Stage CSV (normalize MAC, validate loc)
# ----------------------------
psql "$PSQL_URL" -v ON_ERROR_STOP=1 <<'SQL'
drop table if exists hut_seed_staging;
create table hut_seed_staging (
  device_id  text not null,
  hutcode    text not null,
  loc        text not null,
  ip         text null,
  mac        text null
);
SQL

python3 - <<PY | psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "\copy hut_seed_staging (device_id,hutcode,loc,ip,mac) from stdin with (format csv, header true)"
import csv, sys, re, uuid

p = "${CSV_PATH}"
hut_expected = "${HUT_CODE}"

loc_re = re.compile(r"^[A-Z][0-9]{2}$")
ip_re  = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")

def norm_mac(m: str) -> str:
    s = (m or "").strip().lower()
    if not s:
        return ""
    parts = re.split(r"[:-]", s)
    parts = [x for x in parts if x != ""]
    parts = [x.zfill(2) for x in parts]
    if len(parts) != 6 or any(not re.fullmatch(r"[0-9a-f]{2}", x) for x in parts):
        raise SystemExit(f"Bad MAC: {m}")
    return ":".join(parts)

w = csv.writer(sys.stdout)
w.writerow(["device_id","hutcode","loc","ip","mac"])

with open(p, newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        hut = (row.get("Hut") or "").strip()
        loc = (row.get("Position") or "").strip()
        ip  = (row.get("Miner IP") or "").strip()
        mac = (row.get("Miner MAC") or "").strip()

        if not hut and not loc and not ip and not mac:
            continue

        if hut != hut_expected:
            raise SystemExit(f"CSV Hut mismatch: found '{hut}', expected '{hut_expected}'")

        if loc and not loc_re.match(loc):
            raise SystemExit(f"Bad Position/loc: '{loc}' (expected A01/B24 etc)")

        if ip and not ip_re.match(ip):
            raise SystemExit(f"Bad Miner IP: '{ip}'")

        macn = norm_mac(mac) if mac else ""
        w.writerow([str(uuid.uuid4()), hut, loc, ip, macn])
PY

echo "Staging checks:"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "select count(*) as rows from hut_seed_staging;"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "select count(*) as missing_ip from hut_seed_staging where ip is null or btrim(ip)='';"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "select ip, count(*) from hut_seed_staging where ip is not null and btrim(ip)<>'' group by ip having count(*)>1;"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "select mac, count(*) from hut_seed_staging where mac is not null and btrim(mac)<>'' group by mac having count(*)>1;"

echo ""
echo "Seeding/upserting MINER devices for site..."

# ----------------------------
# 3) Upsert devices using externalId = <hutCode>.<loc>
# ----------------------------
psql "$PSQL_URL" -v ON_ERROR_STOP=1 <<SQL
with src as (
  select
    device_id,
    loc,
    ip,
    mac
  from hut_seed_staging
  where hutcode='${HUT_CODE}'
    and loc is not null and btrim(loc) <> ''
),
up as (
  insert into "Device"(id, "siteId", "externalId", kind, name, meta)
  select
    src.device_id,
    '${SITE_ID}',
    '${HUT_CODE}.' || src.loc,
    'MINER',
    src.loc,
    jsonb_strip_nulls(jsonb_build_object(
      'loc', src.loc,
      'host', nullif(btrim(src.ip), ''),
      'ip',   nullif(btrim(src.ip), ''),
      'mac',  nullif(btrim(src.mac), ''),
      'hutCode', '${HUT_CODE}'
    ))
  from src
  on conflict ("siteId", "externalId") do update
    set
      name = excluded.name,
      meta = coalesce("Device".meta, '{}'::jsonb) || excluded.meta
  returning 1
)
select count(*) as upserted_devices from up;
SQL

echo ""
echo "Verify device loc counts for this site:"
psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c \
  "select left((meta->>'loc'),1) as row, count(*) as n
   from \"Device\"
   where \"siteId\"='${SITE_ID}' and kind='MINER'
   group by 1
   order by 1;"

echo ""
echo "DONE."
echo "Next: run the agent on that LAN to get TH/s + temps."

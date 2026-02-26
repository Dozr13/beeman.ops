## Adding new huts / sites

Running the beeman-ops/scripts/onboard-hut.sh like this:
./scripts/onboard-hut.sh <hut name> <site code> "<site name>"

example:
./scripts/onboard-hut.sh Welker180kw WELKER "Welker"

** SHOULD OUTPUT: **

╭─    ~/git/beeman-ops    holy-hell \*3 !3 ?7 ····························································································································· ✔  22.22.0   08:26:10 AM  ─╮
╰─ ./scripts/onboard-hut.sh Welker180kw WELKER "Welker" ─╯
Onboarding:
HUT: Welker180kw
SITE: WELKER (Welker)
CSV: packages/ops-data/huts/Welker180kw/mapping.csv

UPDATE 0
INSERT 0 1
DB OK:
siteId=b5f550df-44ad-416a-a831-c07900668589
hutId=9bbec5d0-76ab-4d1a-a6e2-00942bd0df3e

DROP TABLE
CREATE TABLE
COPY 48
Staging checks:
rows

---

48
(1 row)

## missing_ip

          1

(1 row)

ip | count
----+-------
(0 rows)

mac | count
-----+-------
(0 rows)

Seeding/upserting MINER devices for site...
upserted_devices

---

               48

(1 row)

Verify device loc counts for this site:
row | n
-----+----
A | 24
B | 24
(2 rows)

DONE.
Next: run the agent on that LAN to get TH/s + temps.

Next steps (do these in order)

1. Ensure the Welker agent config file is correct on disk

From repo root:

cat packages/agent/config/Welker180kw.yml | sed -n '1,120p'

Make sure it matches the corrected YAML I gave you (A06=192.168.1.46, A07=192.168.1.107, A09=192.168.1.33, etc), and A10 is commented.

2. Quick connectivity spot-check (2–3 miners)
   nc -vz 192.168.1.68 4028
   nc -vz 192.168.1.49 4028
   nc -vz 192.168.1.107 4028
3. Run the agent on your laptop (wired)
   yarn workspace @ops/agent dev -- --config packages/agent/config/Welker180kw.yml

Leave it running for 2–5 minutes.

4. Confirm data is landing in DB (DeviceStatus timestamps)
   psql "$DATABASE_URL" -c "
   select d.\"externalId\", ds.ts
   from \"Device\" d
   join \"DeviceStatus\" ds on ds.\"deviceId\" = d.id
   where d.\"siteId\" = (select id from \"Site\" where code='WELKER')
   and d.kind='MINER'
   order by ds.ts desc
   limit 15;
   "

If you see fresh timestamps updating, you’re done: UI should start showing live status/TH.

A10 (missing IP) — what to do

Right now you have 48 devices in DB, but the agent will only poll 47 targets until A10 shows up.

Once A10 comes online (shows up in nmap), add its IP to mapping.csv, re-run:

./scripts/onboard-hut.sh Welker180kw WELKER "Welker"

(and uncomment A10 in the YAML).

## Important commands

Run:

`nmap -p 4028 --open -n 192.168.1.0/24`

to get a list of miners with port 4028 open

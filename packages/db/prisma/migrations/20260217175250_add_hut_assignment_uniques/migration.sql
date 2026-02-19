CREATE UNIQUE INDEX IF NOT EXISTS "HutAssignment_one_current_per_hut"
ON "HutAssignment" ("hutId")
WHERE "endsAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "HutAssignment_one_current_per_site"
ON "HutAssignment" ("siteId")
WHERE "endsAt" IS NULL;

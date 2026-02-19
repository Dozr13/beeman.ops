/*
  site_type_to_location_kinds
  - Replace old SiteType enum values (HASHHUT/WELLSITE)
  - With location kinds: UNKNOWN/WELL/PAD/FACILITY/YARD
  - Map existing rows to UNKNOWN (no guessing)
*/

-- 1) Create the new enum type (temp name)
CREATE TYPE "SiteType_new" AS ENUM ('UNKNOWN', 'WELL', 'PAD', 'FACILITY', 'YARD');

-- 2) Drop default so we can change the column type cleanly
ALTER TABLE "Site" ALTER COLUMN "type" DROP DEFAULT;

-- 3) Convert column to the new enum, mapping old values -> UNKNOWN
ALTER TABLE "Site"
  ALTER COLUMN "type"
  TYPE "SiteType_new"
  USING (
    CASE "type"::text
      WHEN 'HASHHUT' THEN 'UNKNOWN'::"SiteType_new"
      WHEN 'WELLSITE' THEN 'UNKNOWN'::"SiteType_new"
      ELSE 'UNKNOWN'::"SiteType_new"
    END
  );

-- 4) Set default to UNKNOWN going forward
ALTER TABLE "Site" ALTER COLUMN "type" SET DEFAULT 'UNKNOWN';

-- 5) Drop the old enum type
DROP TYPE "SiteType";

-- 6) Rename the new enum type to the original name
ALTER TYPE "SiteType_new" RENAME TO "SiteType";

-- Multi-jetty upgrade for existing PortMaster databases.
-- Fresh installs: prefer `npm run db:push` + `npm run db:seed`.
--
-- Run:
--   psql "$DATABASE_URL" -f drizzle/0002_multi_jetty.sql
-- Then:
--   npm run db:push
--   npm run db:seed   # re-seed demo (~33 jetties); destructive wipe

DO $$ BEGIN
  ALTER TYPE "public"."location_side" ADD VALUE IF NOT EXISTS 'GENERAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "jetties" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "area" text,
  "slug" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "jetties_slug_unique" ON "jetties" ("slug");
CREATE INDEX IF NOT EXISTS "jetty_active_idx" ON "jetties" ("active", "sort_order");

-- Placeholder jetty so NOT NULL FKs can land before re-seed
INSERT INTO "jetties" ("id", "name", "area", "slug", "active", "notes", "sort_order")
VALUES (
  'jty_legacy_bridge',
  'Penang Bridge Fishing',
  'Penang Bridge',
  'penang-bridge-fishing',
  true,
  'Legacy upgrade placeholder — run db:seed to replace with full directory',
  33
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "jetties" ("id", "name", "area", "slug", "active", "notes", "sort_order")
SELECT
  'jty_legacy_bridge',
  'Penang Bridge Fishing',
  'Penang Bridge',
  'penang-bridge-fishing',
  true,
  'Legacy upgrade placeholder',
  33
WHERE NOT EXISTS (SELECT 1 FROM "jetties" WHERE "slug" = 'penang-bridge-fishing');

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "jetty_id" text;
ALTER TABLE "handlers" ADD COLUMN IF NOT EXISTS "jetty_id" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "jetty_id" text;

UPDATE "locations"
SET "jetty_id" = (SELECT "id" FROM "jetties" WHERE "slug" = 'penang-bridge-fishing' LIMIT 1)
WHERE "jetty_id" IS NULL;

UPDATE "handlers"
SET "jetty_id" = (SELECT "id" FROM "jetties" WHERE "slug" = 'penang-bridge-fishing' LIMIT 1)
WHERE "jetty_id" IS NULL;

UPDATE "bookings" b
SET "jetty_id" = l."jetty_id"
FROM "locations" l
WHERE b."location_id" = l."id" AND b."jetty_id" IS NULL;

UPDATE "bookings"
SET "jetty_id" = (SELECT "id" FROM "jetties" WHERE "slug" = 'penang-bridge-fishing' LIMIT 1)
WHERE "jetty_id" IS NULL;

DO $$ BEGIN
  ALTER TABLE "locations" ALTER COLUMN "jetty_id" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "handlers" ALTER COLUMN "jetty_id" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ALTER COLUMN "jetty_id" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "locations"
    ADD CONSTRAINT "locations_jetty_id_jetties_id_fk"
    FOREIGN KEY ("jetty_id") REFERENCES "jetties"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "handlers"
    ADD CONSTRAINT "handlers_jetty_id_jetties_id_fk"
    FOREIGN KEY ("jetty_id") REFERENCES "jetties"("id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_jetty_id_jetties_id_fk"
    FOREIGN KEY ("jetty_id") REFERENCES "jetties"("id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "location_side_number_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "location_jetty_side_number_idx"
  ON "locations" ("jetty_id", "side", "number");
CREATE INDEX IF NOT EXISTS "location_jetty_idx" ON "locations" ("jetty_id", "status");
CREATE INDEX IF NOT EXISTS "booking_jetty_idx" ON "bookings" ("jetty_id", "trip_date", "status");

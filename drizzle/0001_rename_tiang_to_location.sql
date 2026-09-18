-- Upgrade path when migrating an existing PortMaster DB that still has `tiangs`.
-- Fresh installs should use 0000_lively_namora.sql only (already has `locations`).
--
-- Run manually if needed:
--   psql "$DATABASE_URL" -f drizzle/0001_rename_tiang_to_location.sql
-- Then: npm run db:seed  (or migrate data as appropriate)

DO $$ BEGIN
  CREATE TYPE "public"."location_side" AS ENUM('GEORGETOWN', 'SEBERANG_PERAI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."location_status" AS ENUM('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."report_type" AS ENUM('WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS "tiangs" RENAME TO "locations";
ALTER TABLE IF EXISTS "bookings" RENAME COLUMN "tiang_id" TO "location_id";
ALTER INDEX IF EXISTS "tiang_side_number_idx" RENAME TO "location_side_number_idx";
ALTER INDEX IF EXISTS "booking_tiang_idx" RENAME TO "booking_location_idx";

ALTER TABLE "locations" ALTER COLUMN "side" TYPE "location_side" USING "side"::text::"location_side";
ALTER TABLE "locations" ALTER COLUMN "status" TYPE "location_status" USING "status"::text::"location_status";

ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "registration" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "policy_accepted_at" timestamp;

CREATE TABLE IF NOT EXISTS "settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" text PRIMARY KEY NOT NULL,
  "type" "report_type" NOT NULL,
  "period_start" text NOT NULL,
  "period_end" text NOT NULL,
  "title" text NOT NULL,
  "summary_json" text NOT NULL,
  "csv_content" text NOT NULL,
  "generated_by" text,
  "generated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "report_period_idx" ON "reports" ("type","period_start");

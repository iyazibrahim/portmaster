-- PRD alignment: pillar/boat statuses, per-pillar MAX, owner login, scan actor
-- Idempotent additive migration (Postgres 16).

DO $$ BEGIN
  CREATE TYPE boat_status AS ENUM (
    'ACTIVE', 'INACTIVE', 'SUSPENDED', 'PERMIT_EXPIRED', 'UNDER_MAINTENANCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migrate location_status OPEN/CLOSED → PRD five-value set
DO $$ BEGIN
  ALTER TYPE location_status RENAME TO location_status_legacy;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE location_status AS ENUM (
    'AVAILABLE',
    'UNAVAILABLE',
    'TEMPORARILY_CLOSED',
    'UNDER_MAINTENANCE',
    'RESTRICTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'status'
  ) THEN
    ALTER TABLE locations ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE locations ALTER COLUMN status TYPE text USING (
      CASE status::text
        WHEN 'OPEN' THEN 'AVAILABLE'
        WHEN 'CLOSED' THEN 'UNAVAILABLE'
        WHEN 'AVAILABLE' THEN 'AVAILABLE'
        WHEN 'UNAVAILABLE' THEN 'UNAVAILABLE'
        WHEN 'TEMPORARILY_CLOSED' THEN 'TEMPORARILY_CLOSED'
        WHEN 'UNDER_MAINTENANCE' THEN 'UNDER_MAINTENANCE'
        WHEN 'RESTRICTED' THEN 'RESTRICTED'
        ELSE 'UNAVAILABLE'
      END
    );
    ALTER TABLE locations ALTER COLUMN status TYPE location_status USING status::location_status;
    ALTER TABLE locations ALTER COLUMN status SET DEFAULT 'AVAILABLE';
  END IF;
EXCEPTION WHEN others THEN
  -- Column may already be on new enum
  NULL;
END $$;

ALTER TABLE locations ADD COLUMN IF NOT EXISTS max_occupancy integer NOT NULL DEFAULT 4;

ALTER TABLE boat_owners ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE boat_owners ADD COLUMN IF NOT EXISTS mykad_last4 text;

ALTER TABLE boats ADD COLUMN IF NOT EXISTS status boat_status NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE boats ADD COLUMN IF NOT EXISTS licence_info text;
-- handler_id becomes optional (Admin owns fleet)
DO $$ BEGIN
  ALTER TABLE boats ALTER COLUMN handler_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

UPDATE boats SET status = CASE WHEN active THEN 'ACTIVE'::boat_status ELSE 'INACTIVE'::boat_status END
WHERE status IS NULL OR status = 'ACTIVE';

ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS actor_user_id text REFERENCES users(id);
DO $$ BEGIN
  ALTER TABLE scan_events ALTER COLUMN handler_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DROP TYPE IF EXISTS location_status_legacy;

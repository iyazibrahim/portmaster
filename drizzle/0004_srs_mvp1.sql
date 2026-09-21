-- PortMaster SRS MVP1 additive schema (apply if drizzle-kit push is unavailable)
-- Safe to run on Postgres 16 after baseline schema exists.

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BLACKLISTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pass_status AS ENUM (
    'PENDING_PAYMENT', 'ACTIVE', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend user_role enum with LLM_VIEWER
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'LLM_VIEWER';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mykad_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mykad_last4 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS citizenship text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_key text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_accepted_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_consent_at timestamp;

ALTER TABLE jetties ADD COLUMN IF NOT EXISTS lat text;
ALTER TABLE jetties ADD COLUMN IF NOT EXISTS lng text;
ALTER TABLE jetties ADD COLUMN IF NOT EXISTS geofence_radius_m integer NOT NULL DEFAULT 200;
ALTER TABLE jetties ADD COLUMN IF NOT EXISTS open_time text NOT NULL DEFAULT '06:00';
ALTER TABLE jetties ADD COLUMN IF NOT EXISTS close_time text NOT NULL DEFAULT '18:00';

CREATE TABLE IF NOT EXISTS boat_owners (
  id text PRIMARY KEY,
  jetty_id text NOT NULL REFERENCES jetties(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_phone text,
  contact_email text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boat_owner_jetty_idx ON boat_owners (jetty_id, active);

ALTER TABLE handlers ADD COLUMN IF NOT EXISTS boat_owner_id text REFERENCES boat_owners(id);

ALTER TABLE boats ADD COLUMN IF NOT EXISTS owner_id text REFERENCES boat_owners(id);
ALTER TABLE boats ADD COLUMN IF NOT EXISTS jetty_id text REFERENCES jetties(id);
ALTER TABLE boats ADD COLUMN IF NOT EXISTS permit_expires_at timestamp;

CREATE TABLE IF NOT EXISTS passes (
  id text PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES users(id),
  jetty_id text NOT NULL REFERENCES jetties(id),
  pillar_id text NOT NULL REFERENCES locations(id),
  boat_owner_id text REFERENCES boat_owners(id),
  boat_id text REFERENCES boats(id),
  valid_on text NOT NULL,
  status pass_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  fee_cents integer NOT NULL DEFAULT 500,
  reserved_until timestamp,
  activated_at timestamp,
  checked_in_at timestamp,
  checked_out_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pass_user_day_idx ON passes (user_id, valid_on);
CREATE INDEX IF NOT EXISTS pass_pillar_day_idx ON passes (pillar_id, valid_on, status);
CREATE INDEX IF NOT EXISTS pass_jetty_day_idx ON passes (jetty_id, valid_on, status);

CREATE TABLE IF NOT EXISTS pass_qr_tokens (
  id text PRIMARY KEY,
  pass_id text NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pass_qr_token_idx ON pass_qr_tokens (token);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS pass_id text UNIQUE REFERENCES passes(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mock';
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS pass_id text REFERENCES passes(id) ON DELETE CASCADE;
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS conflict_flag boolean NOT NULL DEFAULT false;
ALTER TABLE scan_events ALTER COLUMN booking_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS account_blocks (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  reason text NOT NULL,
  created_by text REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  lifted_at timestamp
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  actor_id text REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  meta_json text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id text PRIMARY KEY,
  type text NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'WARNING',
  title text NOT NULL,
  description text,
  pass_id text REFERENCES passes(id),
  boat_id text REFERENCES boats(id),
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id text PRIMARY KEY,
  type text NOT NULL,
  description text NOT NULL,
  status incident_status NOT NULL DEFAULT 'OPEN',
  pass_id text REFERENCES passes(id),
  pillar_id text REFERENCES locations(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

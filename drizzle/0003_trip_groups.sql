-- Multi-tiang trip groups: linked bookings share trip_group_id.
-- Primary leg holds seats, payment, and boarding QR.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS trip_group_id text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT true;

-- Backfill existing rows: each booking is its own group.
UPDATE bookings
SET trip_group_id = id
WHERE trip_group_id IS NULL;

ALTER TABLE bookings
  ALTER COLUMN trip_group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS booking_trip_group_idx ON bookings (trip_group_id);

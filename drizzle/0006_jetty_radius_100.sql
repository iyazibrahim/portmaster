-- Align jetty purchase geofence default to 100 metres (PDPA / pass purchase radius).
ALTER TABLE "jetties" ALTER COLUMN "geofence_radius_m" SET DEFAULT 100;
UPDATE "jetties" SET "geofence_radius_m" = 100 WHERE "geofence_radius_m" = 250 OR "geofence_radius_m" = 200;

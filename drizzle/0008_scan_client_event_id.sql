-- Offline CI/CO: idempotent client event ids for flaky/offline scan sync
ALTER TABLE "scan_events" ADD COLUMN IF NOT EXISTS "client_event_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "scan_events_client_event_id_uidx"
  ON "scan_events" ("client_event_id");

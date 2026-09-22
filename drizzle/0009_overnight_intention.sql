-- Phase B: overnight stay intention (not multi-day pass validity)
ALTER TABLE "passes" ADD COLUMN IF NOT EXISTS "intends_overnight" boolean DEFAULT false NOT NULL;
ALTER TABLE "passes" ADD COLUMN IF NOT EXISTS "expected_return_on" text;

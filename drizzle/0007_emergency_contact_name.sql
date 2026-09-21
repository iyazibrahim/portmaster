-- FR-REG-002: separate emergency contact name from number
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text;

CREATE TYPE "public"."booking_status" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."location_side" AS ENUM('GEORGETOWN', 'SEBERANG_PERAI');--> statement-breakpoint
CREATE TYPE "public"."location_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."scan_type" AS ENUM('CHECK_IN', 'CHECK_OUT');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('BOARDING', 'CHECKOUT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'HANDLER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "boat_seats" (
	"id" text PRIMARY KEY NOT NULL,
	"boat_id" text NOT NULL,
	"label" text NOT NULL,
	"row" integer NOT NULL,
	"col" integer NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boats" (
	"id" text PRIMARY KEY NOT NULL,
	"handler_id" text NOT NULL,
	"name" text NOT NULL,
	"registration" text,
	"capacity" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"price_per_person_cents" integer DEFAULT 5000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"token" text NOT NULL,
	"purpose" "token_purpose" DEFAULT 'BOARDING' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "booking_seats" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"boat_seat_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handler_id" text NOT NULL,
	"location_id" text NOT NULL,
	"boat_id" text NOT NULL,
	"trip_date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"party_size" integer NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"total_cents" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handlers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"license_no" text,
	"mock_earnings_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "handlers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"side" "location_side" NOT NULL,
	"name" text NOT NULL,
	"status" "location_status" DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"tags" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"mock_ref" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_config" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value_cents" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "pricing_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reports" (
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
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"handler_id" text NOT NULL,
	"type" "scan_type" NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"lat" text,
	"lng" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"phone" text,
	"emergency_contact" text,
	"policy_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boat_seats" ADD CONSTRAINT "boat_seats_boat_id_boats_id_fk" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boats" ADD CONSTRAINT "boats_handler_id_handlers_id_fk" FOREIGN KEY ("handler_id") REFERENCES "public"."handlers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_access_tokens" ADD CONSTRAINT "booking_access_tokens_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_boat_seat_id_boat_seats_id_fk" FOREIGN KEY ("boat_seat_id") REFERENCES "public"."boat_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_handler_id_handlers_id_fk" FOREIGN KEY ("handler_id") REFERENCES "public"."handlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_boat_id_boats_id_fk" FOREIGN KEY ("boat_id") REFERENCES "public"."boats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handlers" ADD CONSTRAINT "handlers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_handler_id_handlers_id_fk" FOREIGN KEY ("handler_id") REFERENCES "public"."handlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boat_seat_pos_idx" ON "boat_seats" USING btree ("boat_id","row","col");--> statement-breakpoint
CREATE INDEX "access_token_idx" ON "booking_access_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_seat_unique_idx" ON "booking_seats" USING btree ("booking_id","boat_seat_id");--> statement-breakpoint
CREATE INDEX "booking_trip_idx" ON "bookings" USING btree ("trip_date","boat_id","start_time");--> statement-breakpoint
CREATE INDEX "booking_location_idx" ON "bookings" USING btree ("location_id","trip_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "location_side_number_idx" ON "locations" USING btree ("side","number");--> statement-breakpoint
CREATE INDEX "report_period_idx" ON "reports" USING btree ("type","period_start");
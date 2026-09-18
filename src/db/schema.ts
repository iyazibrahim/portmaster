import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["USER", "HANDLER", "ADMIN"]);
export const locationSideEnum = pgEnum("location_side", [
  "GEORGETOWN",
  "SEBERANG_PERAI",
  "GENERAL",
]);
export const locationStatusEnum = pgEnum("location_status", ["OPEN", "CLOSED"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);
export const scanTypeEnum = pgEnum("scan_type", ["CHECK_IN", "CHECK_OUT"]);
export const tokenPurposeEnum = pgEnum("token_purpose", [
  "BOARDING",
  "CHECKOUT",
]);
export const reportTypeEnum = pgEnum("report_type", ["WEEKLY", "MONTHLY"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  phone: text("phone"),
  emergencyContact: text("emergency_contact"),
  policyAcceptedAt: timestamp("policy_accepted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const jetties = pgTable(
  "jetties",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    area: text("area"),
    slug: text("slug").notNull().unique(),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("jetty_active_idx").on(t.active, t.sortOrder)],
);

export const handlers = pgTable("handlers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  jettyId: text("jetty_id")
    .notNull()
    .references(() => jetties.id),
  displayName: text("display_name").notNull(),
  licenseNo: text("license_no"),
  mockEarningsCents: integer("mock_earnings_cents").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(),
    jettyId: text("jetty_id")
      .notNull()
      .references(() => jetties.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    side: locationSideEnum("side").notNull(),
    name: text("name").notNull(),
    status: locationStatusEnum("status").notNull().default("OPEN"),
    notes: text("notes"),
    tags: text("tags"),
  },
  (t) => [
    uniqueIndex("location_jetty_side_number_idx").on(
      t.jettyId,
      t.side,
      t.number,
    ),
    index("location_jetty_idx").on(t.jettyId, t.status),
  ],
);

export const boats = pgTable("boats", {
  id: text("id").primaryKey(),
  handlerId: text("handler_id")
    .notNull()
    .references(() => handlers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  registration: text("registration"),
  capacity: integer("capacity").notNull(),
  active: boolean("active").notNull().default(true),
  pricePerPersonCents: integer("price_per_person_cents").notNull().default(5000),
});

export const boatSeats = pgTable(
  "boat_seats",
  {
    id: text("id").primaryKey(),
    boatId: text("boat_id")
      .notNull()
      .references(() => boats.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    row: integer("row").notNull(),
    col: integer("col").notNull(),
    blocked: boolean("blocked").notNull().default(false),
  },
  (t) => [uniqueIndex("boat_seat_pos_idx").on(t.boatId, t.row, t.col)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    handlerId: text("handler_id")
      .notNull()
      .references(() => handlers.id),
    jettyId: text("jetty_id")
      .notNull()
      .references(() => jetties.id),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id),
    boatId: text("boat_id")
      .notNull()
      .references(() => boats.id),
    tripDate: text("trip_date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull(), // HH:mm
    endTime: text("end_time").notNull(),
    partySize: integer("party_size").notNull(),
    status: bookingStatusEnum("status").notNull().default("PENDING_PAYMENT"),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("booking_trip_idx").on(t.tripDate, t.boatId, t.startTime),
    index("booking_location_idx").on(t.locationId, t.tripDate, t.status),
    index("booking_jetty_idx").on(t.jettyId, t.tripDate, t.status),
  ],
);

export const bookingSeats = pgTable(
  "booking_seats",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    boatSeatId: text("boat_seat_id")
      .notNull()
      .references(() => boatSeats.id),
  },
  (t) => [uniqueIndex("booking_seat_unique_idx").on(t.bookingId, t.boatSeatId)],
);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  mockRef: text("mock_ref"),
  paidAt: timestamp("paid_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const bookingAccessTokens = pgTable(
  "booking_access_tokens",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    purpose: tokenPurposeEnum("purpose").notNull().default("BOARDING"),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { mode: "date" }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("access_token_idx").on(t.token)],
);

export const scanEvents = pgTable("scan_events", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  handlerId: text("handler_id")
    .notNull()
    .references(() => handlers.id),
  type: scanTypeEnum("type").notNull(),
  scannedAt: timestamp("scanned_at", { mode: "date" }).notNull().defaultNow(),
  lat: text("lat"),
  lng: text("lng"),
  note: text("note"),
});

export const pricingConfig = pgTable("pricing_config", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  valueCents: integer("value_cents").notNull(),
  label: text("label").notNull(),
});

/** Ops + IT key/value settings (IT secrets stored hashed/masked as needed). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/** Generated report history for weekly/monthly CSV summaries. */
export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    type: reportTypeEnum("type").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    title: text("title").notNull(),
    summaryJson: text("summary_json").notNull(),
    csvContent: text("csv_content").notNull(),
    generatedBy: text("generated_by").references(() => users.id),
    generatedAt: timestamp("generated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("report_period_idx").on(t.type, t.periodStart)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  handler: one(handlers),
  bookings: many(bookings),
  sessions: many(sessions),
}));

export const jettiesRelations = relations(jetties, ({ many }) => ({
  locations: many(locations),
  handlers: many(handlers),
  bookings: many(bookings),
}));

export const handlersRelations = relations(handlers, ({ one, many }) => ({
  user: one(users, { fields: [handlers.userId], references: [users.id] }),
  jetty: one(jetties, { fields: [handlers.jettyId], references: [jetties.id] }),
  boats: many(boats),
  bookings: many(bookings),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  jetty: one(jetties, { fields: [locations.jettyId], references: [jetties.id] }),
  bookings: many(bookings),
}));

export const boatsRelations = relations(boats, ({ one, many }) => ({
  handler: one(handlers, { fields: [boats.handlerId], references: [handlers.id] }),
  seats: many(boatSeats),
  bookings: many(bookings),
}));

export const boatSeatsRelations = relations(boatSeats, ({ one, many }) => ({
  boat: one(boats, { fields: [boatSeats.boatId], references: [boats.id] }),
  bookingSeats: many(bookingSeats),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  handler: one(handlers, {
    fields: [bookings.handlerId],
    references: [handlers.id],
  }),
  jetty: one(jetties, { fields: [bookings.jettyId], references: [jetties.id] }),
  location: one(locations, {
    fields: [bookings.locationId],
    references: [locations.id],
  }),
  boat: one(boats, { fields: [bookings.boatId], references: [boats.id] }),
  seats: many(bookingSeats),
  payment: one(payments),
  tokens: many(bookingAccessTokens),
  scans: many(scanEvents),
}));

export const bookingSeatsRelations = relations(bookingSeats, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSeats.bookingId],
    references: [bookings.id],
  }),
  boatSeat: one(boatSeats, {
    fields: [bookingSeats.boatSeatId],
    references: [boatSeats.id],
  }),
}));

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type LocationSide = (typeof locationSideEnum.enumValues)[number];
export type ReportType = (typeof reportTypeEnum.enumValues)[number];

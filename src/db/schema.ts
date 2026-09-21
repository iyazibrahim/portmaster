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

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "HANDLER",
  "ADMIN",
  "LLM_VIEWER",
]);
export const accountStatusEnum = pgEnum("account_status", [
  "ACTIVE",
  "SUSPENDED",
  "BLACKLISTED",
]);
export const locationSideEnum = pgEnum("location_side", [
  "GEORGETOWN",
  "SEBERANG_PERAI",
  "GENERAL",
]);
export const locationStatusEnum = pgEnum("location_status", [
  "AVAILABLE",
  "UNAVAILABLE",
  "TEMPORARILY_CLOSED",
  "UNDER_MAINTENANCE",
  "RESTRICTED",
]);
export const boatStatusEnum = pgEnum("boat_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PERMIT_EXPIRED",
  "UNDER_MAINTENANCE",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);
export const passStatusEnum = pgEnum("pass_status", [
  "PENDING_PAYMENT",
  "ACTIVE",
  "CHECKED_IN",
  "CHECKED_OUT",
  "EXPIRED",
  "CANCELLED",
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
export const alertSeverityEnum = pgEnum("alert_severity", [
  "INFO",
  "WARNING",
  "CRITICAL",
]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  accountStatus: accountStatusEnum("account_status")
    .notNull()
    .default("ACTIVE"),
  phone: text("phone"),
  emergencyContact: text("emergency_contact"),
  emergencyContactName: text("emergency_contact_name"),
  address: text("address"),
  myKadHash: text("mykad_hash"),
  myKadLast4: text("mykad_last4"),
  dob: text("dob"), // YYYY-MM-DD
  citizenship: text("citizenship"), // MY expected
  photoKey: text("photo_key"),
  policyAcceptedAt: timestamp("policy_accepted_at", { mode: "date" }),
  pdpaAcceptedAt: timestamp("pdpa_accepted_at", { mode: "date" }),
  locationConsentAt: timestamp("location_consent_at", { mode: "date" }),
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
    lat: text("lat"),
    lng: text("lng"),
    geofenceRadiusM: integer("geofence_radius_m").notNull().default(100),
    openTime: text("open_time").notNull().default("06:00"),
    closeTime: text("close_time").notNull().default("18:00"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("jetty_active_idx").on(t.active, t.sortOrder)],
);

export const boatOwners = pgTable(
  "boat_owners",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    jettyId: text("jetty_id")
      .notNull()
      .references(() => jetties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    myKadLast4: text("mykad_last4"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("boat_owner_jetty_idx").on(t.jettyId, t.active)],
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
  boatOwnerId: text("boat_owner_id").references(() => boatOwners.id),
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
    status: locationStatusEnum("status").notNull().default("AVAILABLE"),
    maxOccupancy: integer("max_occupancy").notNull().default(4),
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
  handlerId: text("handler_id").references(() => handlers.id, {
    onDelete: "set null",
  }),
  ownerId: text("owner_id").references(() => boatOwners.id),
  jettyId: text("jetty_id").references(() => jetties.id),
  name: text("name").notNull(),
  registration: text("registration"),
  capacity: integer("capacity").notNull(),
  status: boatStatusEnum("status").notNull().default("ACTIVE"),
  /** Derived convenience: true when status === ACTIVE and permit valid. */
  active: boolean("active").notNull().default(true),
  permitExpiresAt: timestamp("permit_expires_at", { mode: "date" }),
  licenceInfo: text("licence_info"),
  pricePerPersonCents: integer("price_per_person_cents").notNull().default(0),
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

/** Legacy seat-map bookings (not primary angler path). */
export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    tripGroupId: text("trip_group_id").notNull(),
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
    tripDate: text("trip_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    partySize: integer("party_size").notNull(),
    status: bookingStatusEnum("status").notNull().default("PENDING_PAYMENT"),
    totalCents: integer("total_cents").notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("booking_trip_idx").on(t.tripDate, t.boatId, t.startTime),
    index("booking_location_idx").on(t.locationId, t.tripDate, t.status),
    index("booking_jetty_idx").on(t.jettyId, t.tripDate, t.status),
    index("booking_trip_group_idx").on(t.tripGroupId),
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

/** Same-day Association fishing pass (primary product). */
export const passes = pgTable(
  "passes",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    jettyId: text("jetty_id")
      .notNull()
      .references(() => jetties.id),
    pillarId: text("pillar_id")
      .notNull()
      .references(() => locations.id),
    boatOwnerId: text("boat_owner_id").references(() => boatOwners.id),
    boatId: text("boat_id").references(() => boats.id),
    validOn: text("valid_on").notNull(), // YYYY-MM-DD MYT
    status: passStatusEnum("status").notNull().default("PENDING_PAYMENT"),
    feeCents: integer("fee_cents").notNull().default(500),
    reservedUntil: timestamp("reserved_until", { mode: "date" }),
    activatedAt: timestamp("activated_at", { mode: "date" }),
    checkedInAt: timestamp("checked_in_at", { mode: "date" }),
    checkedOutAt: timestamp("checked_out_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("pass_user_day_idx").on(t.userId, t.validOn),
    index("pass_pillar_day_idx").on(t.pillarId, t.validOn, t.status),
    index("pass_jetty_day_idx").on(t.jettyId, t.validOn, t.status),
  ],
);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  passId: text("pass_id")
    .unique()
    .references(() => passes.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  mockRef: text("mock_ref"),
  provider: text("provider").notNull().default("mock"),
  paidAt: timestamp("paid_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const passQrTokens = pgTable(
  "pass_qr_tokens",
  {
    id: text("id").primaryKey(),
    passId: text("pass_id")
      .notNull()
      .references(() => passes.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    usedAt: timestamp("used_at", { mode: "date" }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("pass_qr_token_idx").on(t.token)],
);

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
  bookingId: text("booking_id").references(() => bookings.id, {
    onDelete: "cascade",
  }),
  passId: text("pass_id").references(() => passes.id, { onDelete: "cascade" }),
  handlerId: text("handler_id").references(() => handlers.id),
  actorUserId: text("actor_user_id").references(() => users.id),
  type: scanTypeEnum("type").notNull(),
  scannedAt: timestamp("scanned_at", { mode: "date" }).notNull().defaultNow(),
  lat: text("lat"),
  lng: text("lng"),
  note: text("note"),
  conflictFlag: boolean("conflict_flag").notNull().default(false),
});

export const accountBlocks = pgTable(
  "account_blocks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // SUSPEND | BLACKLIST
    reason: text("reason").notNull(),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    liftedAt: timestamp("lifted_at", { mode: "date" }),
  },
  (t) => [index("account_block_user_idx").on(t.userId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metaJson: text("meta_json"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    severity: alertSeverityEnum("severity").notNull().default("WARNING"),
    title: text("title").notNull(),
    description: text("description"),
    passId: text("pass_id").references(() => passes.id),
    boatId: text("boat_id").references(() => boats.id),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("alert_open_idx").on(t.resolvedAt, t.createdAt)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    status: incidentStatusEnum("status").notNull().default("OPEN"),
    passId: text("pass_id").references(() => passes.id),
    pillarId: text("pillar_id").references(() => locations.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("incident_status_idx").on(t.status, t.createdAt)],
);

export const pricingConfig = pgTable("pricing_config", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  valueCents: integer("value_cents").notNull(),
  label: text("label").notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

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
  passes: many(passes),
  sessions: many(sessions),
}));

export const jettiesRelations = relations(jetties, ({ many }) => ({
  locations: many(locations),
  handlers: many(handlers),
  bookings: many(bookings),
  boatOwners: many(boatOwners),
  passes: many(passes),
}));

export const boatOwnersRelations = relations(boatOwners, ({ one, many }) => ({
  user: one(users, {
    fields: [boatOwners.userId],
    references: [users.id],
  }),
  jetty: one(jetties, {
    fields: [boatOwners.jettyId],
    references: [jetties.id],
  }),
  boats: many(boats),
  handlers: many(handlers),
  passes: many(passes),
}));

export const handlersRelations = relations(handlers, ({ one, many }) => ({
  user: one(users, { fields: [handlers.userId], references: [users.id] }),
  jetty: one(jetties, { fields: [handlers.jettyId], references: [jetties.id] }),
  boatOwner: one(boatOwners, {
    fields: [handlers.boatOwnerId],
    references: [boatOwners.id],
  }),
  boats: many(boats),
  bookings: many(bookings),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  jetty: one(jetties, { fields: [locations.jettyId], references: [jetties.id] }),
  bookings: many(bookings),
  passes: many(passes),
}));

export const boatsRelations = relations(boats, ({ one, many }) => ({
  handler: one(handlers, { fields: [boats.handlerId], references: [handlers.id] }),
  owner: one(boatOwners, {
    fields: [boats.ownerId],
    references: [boatOwners.id],
  }),
  jetty: one(jetties, { fields: [boats.jettyId], references: [jetties.id] }),
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

export const passesRelations = relations(passes, ({ one, many }) => ({
  user: one(users, { fields: [passes.userId], references: [users.id] }),
  jetty: one(jetties, { fields: [passes.jettyId], references: [jetties.id] }),
  pillar: one(locations, {
    fields: [passes.pillarId],
    references: [locations.id],
  }),
  boatOwner: one(boatOwners, {
    fields: [passes.boatOwnerId],
    references: [boatOwners.id],
  }),
  boat: one(boats, { fields: [passes.boatId], references: [boats.id] }),
  qrTokens: many(passQrTokens),
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
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type PassStatus = (typeof passStatusEnum.enumValues)[number];
export type LocationSide = (typeof locationSideEnum.enumValues)[number];
export type LocationStatus = (typeof locationStatusEnum.enumValues)[number];
export type BoatStatus = (typeof boatStatusEnum.enumValues)[number];
export type ReportType = (typeof reportTypeEnum.enumValues)[number];
export type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];
export type AlertSeverity = (typeof alertSeverityEnum.enumValues)[number];

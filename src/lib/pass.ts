import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  handlers,
  jetties,
  locations,
  passQrTokens,
  passes,
  payments,
  scanEvents,
  settings,
  users,
  type PassStatus,
} from "@/db/schema";
import {
  PASS_BLOCKING_STATUSES,
  PASS_OCCUPANCY_STATUSES,
  PILLAR_SELLABLE_STATUS,
  assertCanCreatePass,
  assertCanSetOvernightIntention,
  canSelfCheckOut,
  canUpdateOvernightIntention,
  defaultExpectedReturnOn,
  isReservationExpired,
  nextStatusAfterCheckIn,
  nextStatusAfterCheckOut,
  nextStatusAfterPaymentFail,
  nextStatusAfterPaymentSuccess,
  nextStatusAfterSelfCheckOut,
  remainingSlots,
  reservationExpiresAt,
  shouldExpireActivePass,
} from "@/domain/pass";
import { writeAudit } from "@/lib/audit";
import { assertWithinGeofence } from "@/lib/geo";
import {
  getPaymentProvider,
  isHitPayEnabled,
} from "@/lib/payments/provider";
import {
  ASSOCIATION_FEE_CENTS,
  DEFAULT_RESERVATION_MINUTES,
  PILLAR_MAX_PAX,
  canBuyMultiplePassesToday,
  canBypassPassGeofence,
  id,
  opaqueToken,
  passReference,
  todayMYT,
} from "@/lib/utils-app";

async function getSettingInt(key: string, fallback: number) {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

/** When false, purchase and operator CI/CO skip jetty GPS. Missing key = required. */
export async function isJettyGeofenceRequired() {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "require_jetty_geofence"))
    .limit(1);
  return row?.value !== "false";
}

/** Cancel expired payment holds. */
export async function expireStaleReservations(now = new Date()) {
  const pending = await db
    .select()
    .from(passes)
    .where(eq(passes.status, "PENDING_PAYMENT"));

  for (const p of pending) {
    if (isReservationExpired(p.reservedUntil, now)) {
      await db
        .update(passes)
        .set({ status: "CANCELLED", updatedAt: now })
        .where(eq(passes.id, p.id));
      await db
        .update(payments)
        .set({ status: "FAILED" })
        .where(and(eq(payments.passId, p.id), eq(payments.status, "PENDING")));
    }
  }
}

/** Unused Active passes from prior calendar days → Expired (frees slot). */
export async function expireOvernightActivePasses(today = todayMYT()) {
  const stale = await db
    .select()
    .from(passes)
    .where(and(eq(passes.status, "ACTIVE"), lt(passes.validOn, today)));

  const now = new Date();
  for (const p of stale) {
    if (!shouldExpireActivePass(p.status, p.validOn, today)) continue;
    await db
      .update(passes)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(eq(passes.id, p.id));
    await db
      .update(passQrTokens)
      .set({ revokedAt: now })
      .where(
        and(eq(passQrTokens.passId, p.id), sql`${passQrTokens.revokedAt} is null`),
      );
  }
}

export async function getPillarOccupancy(
  pillarId: string,
  validOn: string,
  maxOccupancy = PILLAR_MAX_PAX,
) {
  await expireStaleReservations();
  await expireOvernightActivePasses();
  const rows = await db
    .select({ status: passes.status, reservedUntil: passes.reservedUntil })
    .from(passes)
    .where(
      and(
        eq(passes.pillarId, pillarId),
        eq(passes.validOn, validOn),
        inArray(passes.status, [...PASS_OCCUPANCY_STATUSES]),
      ),
    );
  const now = new Date();
  const expiredReservationCount = rows.filter(
    (r) =>
      r.status === "PENDING_PAYMENT" &&
      isReservationExpired(r.reservedUntil, now),
  ).length;
  return {
    heldCount: rows.length,
    expiredReservationCount,
    remaining: remainingSlots(
      {
        heldCount: rows.length,
        expiredReservationCount,
      },
      maxOccupancy,
    ),
  };
}

export async function createPassPendingPayment(input: {
  userId: string;
  jettyId: string;
  pillarId: string;
  lat?: string;
  lng?: string;
  actorId?: string;
  intendsOvernight?: boolean;
  expectedReturnOn?: string | null;
}) {
  await expireStaleReservations();
  await expireOvernightActivePasses();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) throw new Error("User not found.");
  if (!user.photoKey && !canBypassPassGeofence(user.email)) {
    throw new Error(
      "Add your identity photo on Profile before buying a pass.",
    );
  }

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, input.jettyId))
    .limit(1);
  if (!jetty || !jetty.active) throw new Error("Jetty not available.");

  const geo = assertWithinGeofence({
    device:
      input.lat != null && input.lng != null
        ? { lat: Number(input.lat), lng: Number(input.lng) }
        : null,
    jettyLat: jetty.lat,
    jettyLng: jetty.lng,
    radiusM: jetty.geofenceRadiusM,
    bypass:
      canBypassPassGeofence(user.email) || !(await isJettyGeofenceRequired()),
  });
  if (!geo.ok) throw new Error(geo.error);

  const [pillar] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, input.pillarId))
    .limit(1);
  if (!pillar) throw new Error("Pillar not found.");

  const validOn = todayMYT();
  const existing = await db
    .select({ status: passes.status })
    .from(passes)
    .where(and(eq(passes.userId, input.userId), eq(passes.validOn, validOn)));

  const occupancy = await getPillarOccupancy(
    input.pillarId,
    validOn,
    pillar.maxOccupancy,
  );
  const rules = assertCanCreatePass({
    accountStatus: user.accountStatus,
    existingSameDayStatuses: existing.map((e) => e.status),
    pillarStatus: pillar.status,
    pillarJettyId: pillar.jettyId,
    boardingJettyId: input.jettyId,
    occupancy,
    maxOccupancy: pillar.maxOccupancy,
    validOn,
    allowMultipleSameDay: canBuyMultiplePassesToday(user.email),
  });
  if (!rules.ok) throw new Error(rules.error);

  const intention = assertCanSetOvernightIntention({
    intendsOvernight: Boolean(input.intendsOvernight),
    expectedReturnOn: input.expectedReturnOn,
    validOn,
  });
  if (!intention.ok) throw new Error(intention.error);

  const minutes = await getSettingInt(
    "reservation_minutes",
    DEFAULT_RESERVATION_MINUTES,
  );
  const feeCents = await getSettingInt(
    "association_fee_cents",
    ASSOCIATION_FEE_CENTS,
  );

  const passId = id("pas");
  const reference = passReference();
  const reservedUntil = reservationExpiresAt(new Date(), minutes);

  await db.insert(passes).values({
    id: passId,
    reference,
    userId: input.userId,
    jettyId: input.jettyId,
    pillarId: input.pillarId,
    boatOwnerId: null,
    validOn,
    status: "PENDING_PAYMENT",
    feeCents,
    reservedUntil,
    intendsOvernight: intention.intendsOvernight,
    expectedReturnOn: intention.expectedReturnOn,
  });

  const provider = getPaymentProvider();
  const paymentId = id("pay");
  await db.insert(payments).values({
    id: paymentId,
    passId,
    amountCents: feeCents,
    status: "PENDING",
    provider: provider.name,
  });

  await writeAudit({
    actorId: input.actorId ?? input.userId,
    action: "pass.create_pending",
    entityType: "pass",
    entityId: passId,
    next: { reference, jettyId: input.jettyId, pillarId: input.pillarId },
  });

  return {
    passId,
    paymentId,
    reference,
    feeCents,
    reservedUntil,
    provider: provider.name,
  };
}

/**
 * Mark pass ACTIVE + issue boarding QR after payment is confirmed.
 * Idempotent when already paid/active.
 */
export async function activatePassAfterPayment(input: {
  passId: string;
  actorId?: string | null;
  providerRef?: string | null;
}) {
  await expireStaleReservations();

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, input.passId))
    .limit(1);
  if (!pass) throw new Error("Pass not found.");

  if (pass.status === "ACTIVE" || pass.status === "CHECKED_IN") {
    const [pay] = await db
      .select()
      .from(payments)
      .where(eq(payments.passId, pass.id))
      .limit(1);
    return {
      passId: pass.id,
      reference: pass.reference,
      alreadyActive: true as const,
      paymentStatus: pay?.status ?? null,
    };
  }

  if (pass.status !== "PENDING_PAYMENT") {
    throw new Error("Pass is not awaiting payment.");
  }
  if (isReservationExpired(pass.reservedUntil)) {
    await db
      .update(passes)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(passes.id, pass.id));
    throw new Error("Reservation expired. Please start again.");
  }

  const next = nextStatusAfterPaymentSuccess(pass.status);
  if (!next) throw new Error("Invalid payment transition.");

  const now = new Date();
  await db
    .update(passes)
    .set({
      status: next,
      activatedAt: now,
      reservedUntil: null,
      updatedAt: now,
    })
    .where(eq(passes.id, pass.id));

  await db
    .update(payments)
    .set({
      status: "PAID",
      ...(input.providerRef ? { mockRef: input.providerRef } : {}),
      paidAt: now,
    })
    .where(eq(payments.passId, pass.id));

  const [existingQr] = await db
    .select({ id: passQrTokens.id })
    .from(passQrTokens)
    .where(eq(passQrTokens.passId, pass.id))
    .limit(1);

  let token: string | undefined;
  if (!existingQr) {
    token = opaqueToken();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600_000);
    await db.insert(passQrTokens).values({
      id: id("pqr"),
      passId: pass.id,
      token,
      expiresAt,
    });
  }

  await writeAudit({
    actorId: input.actorId ?? pass.userId,
    action: "pass.pay_success",
    entityType: "pass",
    entityId: pass.id,
    next: { status: next, providerRef: input.providerRef ?? null },
  });

  return {
    passId: pass.id,
    reference: pass.reference,
    token,
    alreadyActive: false as const,
  };
}

/** Create / refresh HitPay checkout URL for a pending pass. */
export async function startHitPayCheckout(passId: string, userId: string) {
  if (!isHitPayEnabled()) {
    throw new Error("HitPay is not configured.");
  }

  await expireStaleReservations();

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, passId))
    .limit(1);
  if (!pass || pass.userId !== userId) throw new Error("Pass not found.");
  if (pass.status !== "PENDING_PAYMENT") {
    throw new Error("Pass is not awaiting payment.");
  }
  if (isReservationExpired(pass.reservedUntil)) {
    await db
      .update(passes)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(passes.id, passId));
    throw new Error("Reservation expired. Please start again.");
  }

  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const provider = getPaymentProvider();
  const intent = await provider.createIntent({
    amountCents: pass.feeCents,
    reference: pass.reference,
    passId: pass.id,
    email: user?.email,
    name: user?.name,
  });

  if (!intent.checkoutUrl) {
    throw new Error("HitPay did not return a checkout URL.");
  }

  await db
    .update(payments)
    .set({
      provider: "hitpay",
      mockRef: intent.id,
      status: "PENDING",
    })
    .where(eq(payments.passId, passId));

  return {
    passId,
    checkoutUrl: intent.checkoutUrl,
    paymentRequestId: intent.id,
  };
}

export async function mockPayPassSuccess(passId: string, userId: string) {
  if (isHitPayEnabled()) {
    throw new Error("Mock payment is disabled while HitPay is configured.");
  }

  await expireStaleReservations();

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, passId))
    .limit(1);
  if (!pass || pass.userId !== userId) throw new Error("Pass not found.");
  if (pass.status !== "PENDING_PAYMENT") {
    throw new Error("Pass is not awaiting payment.");
  }
  if (isReservationExpired(pass.reservedUntil)) {
    await db
      .update(passes)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(passes.id, passId));
    throw new Error("Reservation expired. Please start again.");
  }

  const provider = getPaymentProvider();
  await provider.createIntent({
    amountCents: pass.feeCents,
    reference: pass.reference,
    passId: pass.id,
  });
  await provider.confirmMockSuccess(`mock_${pass.reference}`);

  return activatePassAfterPayment({
    passId,
    actorId: userId,
    providerRef: `MOCK-${pass.reference}`,
  });
}

export async function mockPayPassFail(passId: string, userId: string) {
  if (isHitPayEnabled()) {
    throw new Error("Mock payment is disabled while HitPay is configured.");
  }

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, passId))
    .limit(1);
  if (!pass || pass.userId !== userId) throw new Error("Pass not found.");

  const next = nextStatusAfterPaymentFail(pass.status);
  if (!next) throw new Error("Pass is not awaiting payment.");

  const provider = getPaymentProvider();
  try {
    await provider.confirmMockFailure(`mock_${pass.reference}`);
  } catch {
    // intent may already be gone
  }

  const now = new Date();
  await db
    .update(passes)
    .set({ status: next, reservedUntil: null, updatedAt: now })
    .where(eq(passes.id, passId));
  await db
    .update(payments)
    .set({ status: "FAILED" })
    .where(eq(payments.passId, passId));

  return { passId };
}

/** Fulfill from HitPay webhook (idempotent). */
export async function fulfillHitPayPayment(input: {
  paymentRequestId: string;
  referenceNumber?: string | null;
}) {
  let passId: string | null = null;

  const [byRef] = await db
    .select({
      passId: payments.passId,
      status: payments.status,
    })
    .from(payments)
    .where(eq(payments.mockRef, input.paymentRequestId))
    .limit(1);

  if (byRef?.passId) {
    passId = byRef.passId;
  } else if (input.referenceNumber) {
    const [pass] = await db
      .select({ id: passes.id })
      .from(passes)
      .where(eq(passes.reference, input.referenceNumber))
      .limit(1);
    passId = pass?.id ?? null;
  }

  if (!passId) {
    throw new Error("Payment not found for HitPay request.");
  }

  return activatePassAfterPayment({
    passId,
    actorId: null,
    providerRef: input.paymentRequestId,
  });
}

export async function cancelActivePass(
  passId: string,
  userId: string,
  actorId?: string,
) {
  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, passId))
    .limit(1);
  if (!pass || pass.userId !== userId) throw new Error("Pass not found.");
  if (pass.status !== "ACTIVE" && pass.status !== "PENDING_PAYMENT") {
    throw new Error("Only Active or Pending Payment passes can be cancelled.");
  }
  await db
    .update(passes)
    .set({ status: "CANCELLED", reservedUntil: null, updatedAt: new Date() })
    .where(eq(passes.id, passId));
  await writeAudit({
    actorId: actorId ?? userId,
    action: "pass.cancel",
    entityType: "pass",
    entityId: passId,
    prev: { status: pass.status },
    next: { status: "CANCELLED" },
  });
  return { passId };
}

export async function updateOvernightIntention(input: {
  passId: string;
  userId: string;
  intendsOvernight: boolean;
  expectedReturnOn?: string | null;
}) {
  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, input.passId))
    .limit(1);
  if (!pass || pass.userId !== input.userId) {
    throw new Error("Pass not found.");
  }
  if (!canUpdateOvernightIntention(pass.status)) {
    throw new Error(
      "Overnight intention can only be updated while the pass is Active or Checked-In.",
    );
  }

  const intention = assertCanSetOvernightIntention({
    intendsOvernight: input.intendsOvernight,
    expectedReturnOn:
      input.intendsOvernight && !input.expectedReturnOn
        ? defaultExpectedReturnOn(pass.validOn)
        : input.expectedReturnOn,
    validOn: pass.validOn,
  });
  if (!intention.ok) throw new Error(intention.error);

  const now = new Date();
  await db
    .update(passes)
    .set({
      intendsOvernight: intention.intendsOvernight,
      expectedReturnOn: intention.expectedReturnOn,
      updatedAt: now,
    })
    .where(eq(passes.id, pass.id));

  await writeAudit({
    actorId: input.userId,
    action: "pass.overnight_intention",
    entityType: "pass",
    entityId: pass.id,
    prev: {
      intendsOvernight: pass.intendsOvernight,
      expectedReturnOn: pass.expectedReturnOn,
    },
    next: {
      intendsOvernight: intention.intendsOvernight,
      expectedReturnOn: intention.expectedReturnOn,
    },
  });

  return {
    passId: pass.id,
    intendsOvernight: intention.intendsOvernight,
    expectedReturnOn: intention.expectedReturnOn,
  };
}

/**
 * Angler self check-out at boarding jetty (Phase B).
 * Requires shore declaration + jetty geofence. Operator scan remains the fallback.
 */
export async function selfCheckOutPass(input: {
  passId: string;
  userId: string;
  lat?: string;
  lng?: string;
  shoreDeclarationAccepted: boolean;
}) {
  if (!input.shoreDeclarationAccepted) {
    throw new Error(
      "Confirm you are already on shore and accept responsibility before checking out.",
    );
  }

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, input.passId))
    .limit(1);
  if (!pass || pass.userId !== input.userId) {
    throw new Error("Pass not found.");
  }
  if (!canSelfCheckOut(pass.status)) {
    throw new Error("Only Checked-In passes can self check-out.");
  }

  const next = nextStatusAfterSelfCheckOut(pass.status);
  if (!next) throw new Error("Invalid self check-out transition.");

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, pass.jettyId))
    .limit(1);
  if (!jetty) throw new Error("Jetty not found.");

  const geo = assertWithinGeofence({
    device:
      input.lat != null && input.lng != null
        ? { lat: Number(input.lat), lng: Number(input.lng) }
        : null,
    jettyLat: jetty.lat,
    jettyLng: jetty.lng,
    radiusM: jetty.geofenceRadiusM,
    bypass: !(await isJettyGeofenceRequired()),
    purpose: "boarding",
  });
  if (!geo.ok) throw new Error(geo.error);

  const now = new Date();
  await db
    .update(passes)
    .set({
      status: next,
      checkedOutAt: now,
      updatedAt: now,
    })
    .where(eq(passes.id, pass.id));

  await db.insert(scanEvents).values({
    id: id("scn"),
    passId: pass.id,
    handlerId: null,
    actorUserId: input.userId,
    type: "CHECK_OUT",
    scannedAt: now,
    lat: input.lat,
    lng: input.lng,
    note: `Pass ${pass.reference} · method SELF · shore declaration accepted`,
  });

  await writeAudit({
    actorId: input.userId,
    action: "pass.self_check_out",
    entityType: "pass",
    entityId: pass.id,
    next: {
      status: next,
      method: "SELF",
      // Round metres — avoid float noise in long-lived audit rows
      distanceM:
        geo.distanceM == null ? null : Math.round(geo.distanceM),
    },
  });

  return { passId: pass.id, status: next as PassStatus };
}

export async function listOpenPillarsForJetty(jettyId: string) {
  const validOn = todayMYT();
  await expireStaleReservations();
  await expireOvernightActivePasses();
  const pillars = await db
    .select()
    .from(locations)
    .where(
      and(
        eq(locations.jettyId, jettyId),
        eq(locations.status, PILLAR_SELLABLE_STATUS),
      ),
    )
    .orderBy(asc(locations.side), asc(locations.number));

  const withSlots = [];
  for (const p of pillars) {
    const occ = await getPillarOccupancy(p.id, validOn, p.maxOccupancy);
    withSlots.push({
      ...p,
      remaining: occ.remaining,
      held: occ.heldCount - occ.expiredReservationCount,
    });
  }
  return withSlots;
}

export async function getPassForUser(passId: string, userId: string) {
  const [pass] = await db
    .select()
    .from(passes)
    .where(and(eq(passes.id, passId), eq(passes.userId, userId)))
    .limit(1);
  return pass ?? null;
}

export async function getActiveQrToken(passId: string) {
  const [token] = await db
    .select()
    .from(passQrTokens)
    .where(
      and(
        eq(passQrTokens.passId, passId),
        sql`${passQrTokens.revokedAt} is null`,
      ),
    )
    .limit(1);
  return token ?? null;
}

export type ScanPreview = {
  passId: string;
  reference: string;
  status: PassStatus;
  validOn: string;
  anglerName: string;
  myKadLast4: string | null;
  photoKey: string | null;
  pillarName: string;
  jettyName: string;
  nextAction: "CHECK_IN" | "CHECK_OUT" | null;
};

export async function previewPassQrToken(token: string): Promise<ScanPreview | null> {
  await expireOvernightActivePasses();
  const raw = token.trim();
  if (!raw) return null;

  const [row] = await db
    .select({
      qr: passQrTokens,
      pass: passes,
      user: users,
      pillar: locations,
      jetty: jetties,
    })
    .from(passQrTokens)
    .innerJoin(passes, eq(passQrTokens.passId, passes.id))
    .innerJoin(users, eq(passes.userId, users.id))
    .innerJoin(locations, eq(passes.pillarId, locations.id))
    .innerJoin(jetties, eq(passes.jettyId, jetties.id))
    .where(eq(passQrTokens.token, raw))
    .limit(1);

  if (!row) return null;
  if (row.qr.revokedAt) throw new Error("Token revoked.");
  if (row.qr.expiresAt.getTime() < Date.now()) {
    throw new Error("Token expired.");
  }

  let nextAction: "CHECK_IN" | "CHECK_OUT" | null = null;
  if (row.pass.status === "ACTIVE") nextAction = "CHECK_IN";
  else if (row.pass.status === "CHECKED_IN") nextAction = "CHECK_OUT";

  return {
    passId: row.pass.id,
    reference: row.pass.reference,
    status: row.pass.status,
    validOn: row.pass.validOn,
    anglerName: row.user.name,
    myKadLast4: row.user.myKadLast4,
    photoKey: row.user.photoKey,
    pillarName: row.pillar.name,
    jettyName: row.jetty.name,
    nextAction,
  };
}

/**
 * Operator/Admin scan of a fishing-pass QR.
 * First scan: ACTIVE → CHECKED_IN. Second: CHECKED_IN → CHECKED_OUT.
 * Checked-In may be checked out after midnight. Active from prior days expires first.
 */
export async function scanPassQrToken(params: {
  token: string;
  handlerId?: string | null;
  actorUserId: string;
  actorRole: "HANDLER" | "ADMIN" | string;
  lat?: string;
  lng?: string;
  /** Idempotency key from device (flaky retry / offline sync). */
  clientEventId?: string | null;
  /**
   * When syncing an offline event: expected action. If server state cannot
   * apply it, mark conflict instead of throwing when `recordConflict` is set.
   */
  expectedAction?: "CHECK_IN" | "CHECK_OUT" | null;
  /** Scanned-at from device (offline); defaults to now. */
  scannedAt?: Date;
  /** If true, invalid transition inserts a conflict-flagged scan_event. */
  recordConflict?: boolean;
}): Promise<{
  action: "CHECK_IN" | "CHECK_OUT";
  passId: string;
  reference: string;
  status: PassStatus;
  preview: ScanPreview;
  conflict?: boolean;
  alreadyApplied?: boolean;
} | null> {
  await expireOvernightActivePasses();
  const raw = params.token.trim();
  if (!raw) return null;

  const clientEventId = params.clientEventId?.trim() || null;
  if (clientEventId) {
    const [existing] = await db
      .select()
      .from(scanEvents)
      .where(eq(scanEvents.clientEventId, clientEventId))
      .limit(1);
    if (existing?.passId) {
      const preview = await previewPassQrToken(raw);
      if (!preview) {
        const [pass] = await db
          .select()
          .from(passes)
          .where(eq(passes.id, existing.passId))
          .limit(1);
        if (!pass) return null;
        return {
          action: existing.type as "CHECK_IN" | "CHECK_OUT",
          passId: pass.id,
          reference: pass.reference,
          status: pass.status,
          preview: {
            passId: pass.id,
            reference: pass.reference,
            status: pass.status,
            validOn: pass.validOn,
            anglerName: "",
            myKadLast4: null,
            photoKey: null,
            pillarName: "",
            jettyName: "",
            nextAction:
              pass.status === "ACTIVE"
                ? "CHECK_IN"
                : pass.status === "CHECKED_IN"
                  ? "CHECK_OUT"
                  : null,
          },
          alreadyApplied: true,
          conflict: existing.conflictFlag,
        };
      }
      return {
        action: existing.type as "CHECK_IN" | "CHECK_OUT",
        passId: preview.passId,
        reference: preview.reference,
        status: preview.status,
        preview,
        alreadyApplied: true,
        conflict: existing.conflictFlag,
      };
    }
  }

  const [row] = await db
    .select({
      qr: passQrTokens,
      pass: passes,
    })
    .from(passQrTokens)
    .innerJoin(passes, eq(passQrTokens.passId, passes.id))
    .where(eq(passQrTokens.token, raw))
    .limit(1);

  if (!row) return null;

  if (row.qr.revokedAt) throw new Error("Token revoked.");
  if (row.qr.expiresAt.getTime() < Date.now()) {
    throw new Error("Token expired.");
  }

  const isAdmin = params.actorRole === "ADMIN";
  let handlerJettyId: string | null = null;

  if (!isAdmin) {
    if (!params.handlerId) throw new Error("Handler profile missing.");
    const [handler] = await db
      .select()
      .from(handlers)
      .where(eq(handlers.id, params.handlerId))
      .limit(1);
    if (!handler) throw new Error("Handler profile missing.");
    handlerJettyId = handler.jettyId;
    if (handler.jettyId !== row.pass.jettyId) {
      throw new Error(
        "This pass was boarded at a different jetty. Use an operator at the boarding jetty.",
      );
    }
  }

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, row.pass.jettyId))
    .limit(1);
  if (!jetty) throw new Error("Jetty not found.");

  const geo = assertWithinGeofence({
    device:
      params.lat != null && params.lng != null
        ? { lat: Number(params.lat), lng: Number(params.lng) }
        : null,
    jettyLat: jetty.lat,
    jettyLng: jetty.lng,
    radiusM: jetty.geofenceRadiusM,
    bypass: isAdmin || !(await isJettyGeofenceRequired()),
    purpose: "boarding",
  });
  if (!geo.ok) throw new Error(geo.error);

  // Check-in: same calendar day only (Active from prior days should already be Expired)
  if (row.pass.status === "ACTIVE" && row.pass.validOn !== todayMYT()) {
    throw new Error(`Pass is only valid for check-in on ${row.pass.validOn}.`);
  }

  const now = params.scannedAt ?? new Date();
  const preview = await previewPassQrToken(raw);
  if (!preview) throw new Error("Pass preview failed.");

  const expected = params.expectedAction ?? null;
  if (expected) {
    const canApply =
      (expected === "CHECK_IN" && row.pass.status === "ACTIVE") ||
      (expected === "CHECK_OUT" && row.pass.status === "CHECKED_IN");
    if (!canApply) {
      if (params.recordConflict && clientEventId) {
        await db.insert(scanEvents).values({
          id: id("scn"),
          passId: row.pass.id,
          handlerId: params.handlerId ?? null,
          actorUserId: params.actorUserId,
          type: expected,
          scannedAt: now,
          lat: params.lat,
          lng: params.lng,
          note: `Conflict: expected ${expected} but pass is ${row.pass.status}`,
          conflictFlag: true,
          clientEventId,
        });
        return {
          action: expected,
          passId: row.pass.id,
          reference: row.pass.reference,
          status: row.pass.status,
          preview,
          conflict: true,
        };
      }
      throw new Error(
        `Pass cannot apply ${expected.replaceAll("_", " ")} in status ${row.pass.status.replaceAll("_", " ")}.`,
      );
    }
  }

  if (row.pass.status === "ACTIVE") {
    const next = nextStatusAfterCheckIn(row.pass.status);
    if (!next) throw new Error("Invalid check-in transition.");
    await db
      .update(passes)
      .set({
        status: next,
        checkedInAt: now,
        updatedAt: now,
      })
      .where(eq(passes.id, row.pass.id));
    await db.insert(scanEvents).values({
      id: id("scn"),
      passId: row.pass.id,
      handlerId: params.handlerId ?? null,
      actorUserId: params.actorUserId,
      type: "CHECK_IN",
      scannedAt: now,
      lat: params.lat,
      lng: params.lng,
      note: `Pass ${row.pass.reference}`,
      clientEventId,
    });
    await writeAudit({
      actorId: params.actorUserId,
      action: "pass.check_in",
      entityType: "pass",
      entityId: row.pass.id,
      next: { status: next, jettyId: handlerJettyId ?? row.pass.jettyId },
    });
    return {
      action: "CHECK_IN",
      passId: row.pass.id,
      reference: row.pass.reference,
      status: next,
      preview: { ...preview, status: next, nextAction: "CHECK_OUT" },
    };
  }

  if (row.pass.status === "CHECKED_IN") {
    // Checkout allowed after midnight
    const next = nextStatusAfterCheckOut(row.pass.status);
    if (!next) throw new Error("Invalid check-out transition.");
    await db
      .update(passes)
      .set({
        status: next,
        checkedOutAt: now,
        updatedAt: now,
      })
      .where(eq(passes.id, row.pass.id));
    await db.insert(scanEvents).values({
      id: id("scn"),
      passId: row.pass.id,
      handlerId: params.handlerId ?? null,
      actorUserId: params.actorUserId,
      type: "CHECK_OUT",
      scannedAt: now,
      lat: params.lat,
      lng: params.lng,
      note: `Pass ${row.pass.reference} · method OPERATOR`,
      clientEventId,
    });
    await writeAudit({
      actorId: params.actorUserId,
      action: "pass.check_out",
      entityType: "pass",
      entityId: row.pass.id,
      next: { status: next, method: "OPERATOR" },
    });
    return {
      action: "CHECK_OUT",
      passId: row.pass.id,
      reference: row.pass.reference,
      status: next,
      preview: { ...preview, status: next, nextAction: null },
    };
  }

  throw new Error(
    `Pass cannot be scanned in status ${row.pass.status.replaceAll("_", " ")}.`,
  );
}

export type { PassStatus };
export { PASS_BLOCKING_STATUSES, PASS_OCCUPANCY_STATUSES };

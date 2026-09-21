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
  isReservationExpired,
  nextStatusAfterCheckIn,
  nextStatusAfterCheckOut,
  nextStatusAfterPaymentFail,
  nextStatusAfterPaymentSuccess,
  remainingSlots,
  reservationExpiresAt,
  shouldExpireActivePass,
} from "@/domain/pass";
import { writeAudit } from "@/lib/audit";
import { assertWithinGeofence } from "@/lib/geo";
import { getPaymentProvider } from "@/lib/payments/provider";
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
    bypass: canBypassPassGeofence(user.email),
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
  });

  const paymentId = id("pay");
  await db.insert(payments).values({
    id: paymentId,
    passId,
    amountCents: feeCents,
    status: "PENDING",
    provider: "mock",
  });

  const provider = getPaymentProvider();
  const intent = await provider.createIntent({
    amountCents: feeCents,
    reference,
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
    intentId: intent.id,
  };
}

export async function mockPayPassSuccess(passId: string, userId: string) {
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

  const next = nextStatusAfterPaymentSuccess(pass.status);
  if (!next) throw new Error("Invalid payment transition.");

  const provider = getPaymentProvider();
  await provider.confirmMockSuccess(`mock_${pass.reference}`);

  const now = new Date();
  await db
    .update(passes)
    .set({
      status: next,
      activatedAt: now,
      reservedUntil: null,
      updatedAt: now,
    })
    .where(eq(passes.id, passId));

  await db
    .update(payments)
    .set({
      status: "PAID",
      mockRef: `MOCK-${pass.reference}`,
      paidAt: now,
    })
    .where(eq(payments.passId, passId));

  const token = opaqueToken();
  // QR usable until checkout; Active expires overnight but Checked-In needs token
  const expiresAt = new Date(now.getTime() + 7 * 24 * 3600_000);
  await db.insert(passQrTokens).values({
    id: id("pqr"),
    passId,
    token,
    expiresAt,
  });

  await writeAudit({
    actorId: userId,
    action: "pass.pay_success",
    entityType: "pass",
    entityId: passId,
    next: { status: next },
  });

  return { passId, token, reference: pass.reference };
}

export async function mockPayPassFail(passId: string, userId: string) {
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
}): Promise<{
  action: "CHECK_IN" | "CHECK_OUT";
  passId: string;
  reference: string;
  status: PassStatus;
  preview: ScanPreview;
} | null> {
  await expireOvernightActivePasses();
  const raw = params.token.trim();
  if (!raw) return null;

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
    bypass: isAdmin,
  });
  if (!geo.ok) throw new Error(geo.error);

  // Check-in: same calendar day only (Active from prior days should already be Expired)
  if (row.pass.status === "ACTIVE" && row.pass.validOn !== todayMYT()) {
    throw new Error(`Pass is only valid for check-in on ${row.pass.validOn}.`);
  }

  const now = new Date();
  const preview = await previewPassQrToken(raw);
  if (!preview) throw new Error("Pass preview failed.");

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
      note: `Pass ${row.pass.reference}`,
    });
    await writeAudit({
      actorId: params.actorUserId,
      action: "pass.check_out",
      entityType: "pass",
      entityId: row.pass.id,
      next: { status: next },
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

import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { alerts, boats, passes, payments, users } from "@/db/schema";
import { id } from "@/lib/utils-app";
import { reportPaymentFailure } from "@/lib/payment-failure-notify";

const PERMIT_WARN_DAYS = 30;

async function hasOpenBoatPermitAlert(boatId: string) {
  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.type, "BOAT_PERMIT_EXPIRY"),
        isNull(alerts.resolvedAt),
        eq(alerts.boatId, boatId),
      ),
    )
    .limit(1);
  return Boolean(existing);
}

/**
 * Upsert system ops alerts from live pass / boat / payment state.
 * Safe to call on admin alerts page load; skips duplicates while open.
 * New PAYMENT_FAILED alerts also email receipt_email once (if SMTP is set).
 */
export async function refreshOpsAlerts() {
  const now = new Date();
  let created = 0;

  const horizon = new Date(now.getTime() + PERMIT_WARN_DAYS * 86_400_000);
  const expiring = await db
    .select({
      id: boats.id,
      name: boats.name,
      registration: boats.registration,
      permitExpiresAt: boats.permitExpiresAt,
    })
    .from(boats)
    .where(
      and(
        sql`${boats.permitExpiresAt} is not null`,
        lte(boats.permitExpiresAt, horizon),
      ),
    );

  for (const b of expiring) {
    if (!b.permitExpiresAt) continue;
    if (await hasOpenBoatPermitAlert(b.id)) {
      continue;
    }
    const days = Math.ceil(
      (b.permitExpiresAt.getTime() - now.getTime()) / 86_400_000,
    );
    const past = days < 0;
    await db.insert(alerts).values({
      id: id("alt"),
      type: "BOAT_PERMIT_EXPIRY",
      severity: past ? "CRITICAL" : "WARNING",
      title: past
        ? `Permit expired · ${b.name}`
        : `Permit expiry within ${PERMIT_WARN_DAYS} days · ${b.name}`,
      description: `${b.registration ?? b.name} permit ${
        past ? "expired" : "expires"
      } on ${b.permitExpiresAt.toISOString().slice(0, 10)}.`,
      boatId: b.id,
    });
    created += 1;
  }

  const failed = await db
    .select({
      id: payments.id,
      passId: payments.passId,
      amountCents: payments.amountCents,
      reference: passes.reference,
      angler: users.name,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .innerJoin(users, eq(passes.userId, users.id))
    .where(eq(payments.status, "FAILED"))
    .limit(50);

  for (const p of failed) {
    if (!p.passId) continue;
    const result = await reportPaymentFailure({
      passId: p.passId,
      reference: p.reference,
      description: `${p.angler} — ${(p.amountCents / 100).toFixed(2)} MYR payment failed.`,
    });
    if (result.alertCreated) created += 1;
  }

  return { created };
}

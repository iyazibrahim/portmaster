import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { alerts, boats, passes, payments, settings, users } from "@/db/schema";
import { isOverdue } from "@/domain/pass";
import { DEFAULT_OVERDUE_HOURS, id } from "@/lib/utils-app";

const PERMIT_WARN_DAYS = 30;

async function overdueHoursFromSettings() {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "overdue_hours"))
    .limit(1);
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_OVERDUE_HOURS;
}

async function hasOpenAlert(opts: {
  type: string;
  passId?: string | null;
  boatId?: string | null;
}) {
  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.type, opts.type),
        isNull(alerts.resolvedAt),
        opts.passId
          ? eq(alerts.passId, opts.passId)
          : opts.boatId
            ? eq(alerts.boatId, opts.boatId)
            : sql`true`,
      ),
    )
    .limit(1);
  return Boolean(existing);
}

/**
 * Upsert system ops alerts from live pass / boat / payment state.
 * Safe to call on admin alerts page load; skips duplicates while open.
 */
export async function refreshOpsAlerts() {
  const overdueHours = await overdueHoursFromSettings();
  const now = new Date();
  let created = 0;

  const checkedIn = await db
    .select({
      id: passes.id,
      reference: passes.reference,
      checkedInAt: passes.checkedInAt,
      angler: users.name,
    })
    .from(passes)
    .innerJoin(users, eq(passes.userId, users.id))
    .where(eq(passes.status, "CHECKED_IN"));

  for (const p of checkedIn) {
    if (!isOverdue(p.checkedInAt, overdueHours, now)) continue;
    if (await hasOpenAlert({ type: "OVERDUE_CHECKIN", passId: p.id })) continue;
    await db.insert(alerts).values({
      id: id("alt"),
      type: "OVERDUE_CHECKIN",
      severity: "WARNING",
      title: `Overdue check-in · ${p.reference}`,
      description: `${p.angler} has been checked in longer than ${overdueHours} hours.`,
      passId: p.id,
    });
    created += 1;
  }

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
    if (await hasOpenAlert({ type: "BOAT_PERMIT_EXPIRY", boatId: b.id })) {
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
    if (await hasOpenAlert({ type: "PAYMENT_FAILED", passId: p.passId })) {
      continue;
    }
    await db.insert(alerts).values({
      id: id("alt"),
      type: "PAYMENT_FAILED",
      severity: "CRITICAL",
      title: `Payment failed · ${p.reference}`,
      description: `${p.angler} — ${(p.amountCents / 100).toFixed(2)} MYR payment failed.`,
      passId: p.passId,
    });
    created += 1;
  }

  return { created };
}

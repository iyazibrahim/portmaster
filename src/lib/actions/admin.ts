"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { db } from "@/db";
import {
  bookings,
  jetties,
  locations,
  payments,
  reports,
  scanEvents,
  settings,
} from "@/db/schema";
import { requireRole } from "@/lib/session";
import { id } from "@/lib/utils-app";

const IT_COOKIE = "it_settings_ok";
const IT_SESSION_MINUTES = 20;

const OPS_KEYS = [
  "support_phone",
  "support_whatsapp",
  "booking_window_copy",
  "platform_commission_pct",
  "location_side_labels",
  "default_party_size_max",
  "maintenance_banner_on",
  "maintenance_banner_text",
] as const;

const IT_KEYS = [
  "qr_token_ttl_hours",
  "payment_gateway_api_url",
  "payment_gateway_key",
  "smtp_host",
  "smtp_user",
  "smtp_pass",
  "webhook_secret",
  "app_url_override",
] as const;

export async function getSettingsMap() {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string
  >;
}

export async function actionSaveOpsSettings(values: Record<string, string>) {
  await requireRole(["ADMIN"]);
  const now = new Date();
  for (const key of OPS_KEYS) {
    if (!(key in values)) continue;
    await db
      .insert(settings)
      .values({ key, value: values[key] ?? "", updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: values[key] ?? "", updatedAt: now },
      });
  }
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function isItSettingsUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(IT_COOKIE)?.value;
  if (!raw) return false;
  const expires = Number(raw);
  return Number.isFinite(expires) && expires > Date.now();
}

export async function actionUnlockItSettings(password: string) {
  await requireRole(["ADMIN"]);
  const map = await getSettingsMap();
  const hash = map.it_settings_password_hash;
  if (!hash) {
    return { ok: false as const, error: "IT password not configured." };
  }
  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return { ok: false as const, error: "Incorrect IT settings password." };
  }
  const expires = Date.now() + IT_SESSION_MINUTES * 60 * 1000;
  const cookieStore = await cookies();
  cookieStore.set(IT_COOKIE, String(expires), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: IT_SESSION_MINUTES * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true as const, minutes: IT_SESSION_MINUTES };
}

export async function actionLockItSettings() {
  await requireRole(["ADMIN"]);
  const cookieStore = await cookies();
  cookieStore.delete(IT_COOKIE);
  revalidatePath("/admin/settings");
}

export async function actionSaveItSettings(values: Record<string, string>) {
  await requireRole(["ADMIN"]);
  if (!(await isItSettingsUnlocked())) {
    return { ok: false as const, error: "IT settings locked. Unlock first." };
  }
  const now = new Date();
  for (const key of IT_KEYS) {
    if (!(key in values)) continue;
    await db
      .insert(settings)
      .values({ key, value: values[key] ?? "", updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: values[key] ?? "", updatedAt: now },
      });
  }
  if (values.it_settings_password && values.it_settings_password.length >= 8) {
    const hash = await bcrypt.hash(values.it_settings_password, 10);
    await db
      .insert(settings)
      .values({
        key: "it_settings_password_hash",
        value: hash,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: hash, updatedAt: now },
      });
  }
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export type ReportSummary = {
  bookingsCount: number;
  revenueCents: number;
  activeAnglers: number;
  checkIns: number;
  topLocations: { name: string; count: number }[];
};

async function buildReportSummary(
  periodStart: string,
  periodEnd: string,
  jettyId?: string,
): Promise<{ summary: ReportSummary; csv: string }> {
  const bookingRows = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      locationId: bookings.locationId,
      totalCents: bookings.totalCents,
      status: bookings.status,
      tripDate: bookings.tripDate,
      locationName: locations.name,
      locationNumber: locations.number,
      jettyName: jetties.name,
    })
    .from(bookings)
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .innerJoin(jetties, eq(bookings.jettyId, jetties.id))
    .where(
      and(
        gte(bookings.tripDate, periodStart),
        lte(bookings.tripDate, periodEnd),
        jettyId ? eq(bookings.jettyId, jettyId) : sql`true`,
      ),
    );

  const paid = await db
    .select({
      cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(payments.status, "PAID"),
        gte(bookings.tripDate, periodStart),
        lte(bookings.tripDate, periodEnd),
        jettyId ? eq(bookings.jettyId, jettyId) : sql`true`,
      ),
    );

  const [checkInRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scanEvents)
    .innerJoin(bookings, eq(scanEvents.bookingId, bookings.id))
    .where(
      and(
        eq(scanEvents.type, "CHECK_IN"),
        gte(bookings.tripDate, periodStart),
        lte(bookings.tripDate, periodEnd),
        jettyId ? eq(bookings.jettyId, jettyId) : sql`true`,
      ),
    );

  const locCounts = new Map<string, { name: string; count: number }>();
  const anglerIds = new Set<string>();
  for (const b of bookingRows) {
    anglerIds.add(b.userId);
    const key = b.locationId;
    const prev = locCounts.get(key) ?? {
      name: `${b.jettyName} · #${b.locationNumber} ${b.locationName}`,
      count: 0,
    };
    prev.count += 1;
    locCounts.set(key, prev);
  }

  const topLocations = [...locCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const summary: ReportSummary = {
    bookingsCount: bookingRows.length,
    revenueCents: Number(paid[0]?.cents ?? 0),
    activeAnglers: anglerIds.size,
    checkIns: Number(checkInRow?.count ?? 0),
    topLocations,
  };

  const csvLines = [
    "metric,value",
    `period_start,${periodStart}`,
    `period_end,${periodEnd}`,
    `jetty_id,${jettyId ?? "all"}`,
    `bookings_count,${summary.bookingsCount}`,
    `revenue_myr_cents,${summary.revenueCents}`,
    `active_anglers,${summary.activeAnglers}`,
    `check_ins,${summary.checkIns}`,
    "",
    "top_location,bookings",
    ...topLocations.map((l) => `"${l.name.replaceAll('"', '""')}",${l.count}`),
    "",
    "trip_date,booking_id,jetty,location,status,total_cents",
    ...bookingRows.map(
      (b) =>
        `${b.tripDate},${b.id},"${b.jettyName.replaceAll('"', '""')}","#${b.locationNumber} ${b.locationName.replaceAll('"', '""')}",${b.status},${b.totalCents}`,
    ),
  ];

  return { summary, csv: csvLines.join("\n") };
}

export async function actionGenerateReport(input: {
  type: "WEEKLY" | "MONTHLY";
  anchorDate?: string;
  jettyId?: string;
}) {
  const session = await requireRole(["ADMIN"]);
  const anchor = input.anchorDate ? new Date(input.anchorDate) : new Date();

  let periodStart: string;
  let periodEnd: string;
  let title: string;

  if (input.type === "WEEKLY") {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    periodStart = format(start, "yyyy-MM-dd");
    periodEnd = format(end, "yyyy-MM-dd");
    title = `Weekly report ${periodStart} → ${periodEnd}`;
  } else {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    periodStart = format(start, "yyyy-MM-dd");
    periodEnd = format(end, "yyyy-MM-dd");
    title = `Monthly report ${format(start, "yyyy-MM")}`;
  }

  if (input.jettyId) {
    const [j] = await db
      .select({ name: jetties.name })
      .from(jetties)
      .where(eq(jetties.id, input.jettyId))
      .limit(1);
    if (j) title = `${title} · ${j.name}`;
  }

  const { summary, csv } = await buildReportSummary(
    periodStart,
    periodEnd,
    input.jettyId,
  );
  const reportId = id("rpt");
  await db.insert(reports).values({
    id: reportId,
    type: input.type,
    periodStart,
    periodEnd,
    title,
    summaryJson: JSON.stringify(summary),
    csvContent: csv,
    generatedBy: session.user.id,
  });

  revalidatePath("/admin/reports");
  return { id: reportId, title, summary };
}

export async function actionPreviewReport(input: {
  type: "WEEKLY" | "MONTHLY";
  anchorDate?: string;
  jettyId?: string;
}) {
  await requireRole(["ADMIN"]);
  const anchor = input.anchorDate ? new Date(input.anchorDate) : new Date();
  let periodStart: string;
  let periodEnd: string;
  if (input.type === "WEEKLY") {
    periodStart = format(startOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd");
    periodEnd = format(endOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd");
  } else {
    periodStart = format(startOfMonth(anchor), "yyyy-MM-dd");
    periodEnd = format(endOfMonth(anchor), "yyyy-MM-dd");
  }
  const { summary, csv } = await buildReportSummary(
    periodStart,
    periodEnd,
    input.jettyId,
  );
  return { periodStart, periodEnd, summary, csv };
}

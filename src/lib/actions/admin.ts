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
  accountBlocks,
  alerts,
  boatOwners,
  boats,
  handlers,
  incidents,
  jetties,
  locations,
  passes,
  payments,
  reports,
  scanEvents,
  settings,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/session";
import { shouldUseSecureAuthCookies } from "@/lib/auth-cookies";
import { writeAudit } from "@/lib/audit";
import { id, DEFAULT_OVERDUE_HOURS } from "@/lib/utils-app";
import type {
  AccountStatus,
  BoatStatus,
  IncidentStatus,
  UserRole,
} from "@/db/schema";
import { isBoatOperational } from "@/lib/geo";
import { isOverdue } from "@/domain/pass";

const IT_COOKIE = "it_settings_ok";
const IT_SESSION_MINUTES = 20;

const OPS_KEYS = [
  "association_fee_cents",
  "reservation_minutes",
  "overdue_hours",
  "default_geofence_radius_m",
  "support_phone",
  "support_whatsapp",
  "maintenance_banner_on",
  "maintenance_banner_text",
  "booking_window_copy",
  "platform_commission_pct",
  "location_side_labels",
  "default_party_size_max",
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
    secure: shouldUseSecureAuthCookies(),
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
  passesCount: number;
  revenueCents: number;
  activeAnglers: number;
  checkIns: number;
  overdueCount: number;
  topLocations: { name: string; count: number }[];
};

async function buildReportSummary(
  periodStart: string,
  periodEnd: string,
  jettyId?: string,
): Promise<{ summary: ReportSummary; csv: string }> {
  const passRows = await db
    .select({
      id: passes.id,
      reference: passes.reference,
      userId: passes.userId,
      pillarId: passes.pillarId,
      feeCents: passes.feeCents,
      status: passes.status,
      validOn: passes.validOn,
      checkedInAt: passes.checkedInAt,
      pillarName: locations.name,
      pillarNumber: locations.number,
      jettyName: jetties.name,
      anglerName: users.name,
    })
    .from(passes)
    .innerJoin(locations, eq(passes.pillarId, locations.id))
    .innerJoin(jetties, eq(passes.jettyId, jetties.id))
    .innerJoin(users, eq(passes.userId, users.id))
    .where(
      and(
        gte(passes.validOn, periodStart),
        lte(passes.validOn, periodEnd),
        jettyId ? eq(passes.jettyId, jettyId) : sql`true`,
      ),
    );

  const paid = await db
    .select({
      cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .where(
      and(
        eq(payments.status, "PAID"),
        gte(passes.validOn, periodStart),
        lte(passes.validOn, periodEnd),
        jettyId ? eq(passes.jettyId, jettyId) : sql`true`,
      ),
    );

  const [checkInRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scanEvents)
    .innerJoin(passes, eq(scanEvents.passId, passes.id))
    .where(
      and(
        eq(scanEvents.type, "CHECK_IN"),
        gte(passes.validOn, periodStart),
        lte(passes.validOn, periodEnd),
        jettyId ? eq(passes.jettyId, jettyId) : sql`true`,
      ),
    );

  const locCounts = new Map<string, { name: string; count: number }>();
  const anglerIds = new Set<string>();
  for (const p of passRows) {
    anglerIds.add(p.userId);
    const key = p.pillarId;
    const prev = locCounts.get(key) ?? {
      name: `${p.jettyName} · #${p.pillarNumber} ${p.pillarName}`,
      count: 0,
    };
    prev.count += 1;
    locCounts.set(key, prev);
  }

  const topLocations = [...locCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const summary: ReportSummary = {
    bookingsCount: passRows.length,
    passesCount: passRows.length,
    revenueCents: Number(paid[0]?.cents ?? 0),
    activeAnglers: anglerIds.size,
    checkIns: Number(checkInRow?.count ?? 0),
    overdueCount: passRows.filter(
      (p) =>
        p.status === "CHECKED_IN" &&
        isOverdue(p.checkedInAt, DEFAULT_OVERDUE_HOURS),
    ).length,
    topLocations,
  };

  const csvLines = [
    "metric,value",
    `period_start,${periodStart}`,
    `period_end,${periodEnd}`,
    `jetty_id,${jettyId ?? "all"}`,
    `passes_count,${summary.passesCount}`,
    `revenue_myr_cents,${summary.revenueCents}`,
    `active_anglers,${summary.activeAnglers}`,
    `check_ins,${summary.checkIns}`,
    "",
    "top_pillar,passes",
    ...topLocations.map((l) => `"${l.name.replaceAll('"', '""')}",${l.count}`),
    "",
    "valid_on,reference,angler,jetty,pillar,status,fee_cents",
    ...passRows.map(
      (p) =>
        `${p.validOn},${p.reference},"${p.anglerName.replaceAll('"', '""')}","${p.jettyName.replaceAll('"', '""')}","#${p.pillarNumber} ${p.pillarName.replaceAll('"', '""')}",${p.status},${p.feeCents}`,
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

export async function actionCreateUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  handlerDisplayName?: string;
  jettyId?: string;
}) {
  await requireRole(["ADMIN"]);
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  const role = input.role;
  if (!name || !email || !input.password) {
    throw new Error("Name, email, and password are required.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!["USER", "HANDLER", "ADMIN", "LLM_VIEWER"].includes(role)) {
    throw new Error("Invalid role.");
  }
  if (role === "HANDLER") {
    if (!input.jettyId?.trim()) throw new Error("Handler needs a jetty.");
    if (!input.handlerDisplayName?.trim()) {
      throw new Error("Handler needs a display name.");
    }
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const userId = id("usr");
  const passwordHash = await bcrypt.hash(input.password, 10);
  await db.insert(users).values({
    id: userId,
    name,
    email,
    phone: input.phone?.trim() || null,
    passwordHash,
    role,
    policyAcceptedAt: new Date(),
  });

  if (role === "HANDLER") {
    await db.insert(handlers).values({
      id: id("hdl"),
      userId,
      jettyId: input.jettyId!,
      displayName: input.handlerDisplayName!.trim(),
      mockEarningsCents: 0,
    });
  }

  revalidatePath("/admin/users");
  return { ok: true as const };
}

/** @deprecated use actionCreateUser */
export async function actionCreateAdminUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  return actionCreateUser({ ...input, role: "ADMIN" });
}

export async function actionUpdateUserRole(input: {
  userId: string;
  role: UserRole;
  handlerDisplayName?: string;
  jettyId?: string;
}) {
  const session = await requireRole(["ADMIN"]);
  if (input.userId === session.user.id && input.role !== "ADMIN") {
    throw new Error("You cannot remove your own admin role.");
  }
  if (!["USER", "HANDLER", "ADMIN", "LLM_VIEWER"].includes(input.role)) {
    throw new Error("Invalid role.");
  }

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!target) throw new Error("User not found.");

  const [existingHandler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, input.userId))
    .limit(1);

  if (input.role === "HANDLER") {
    if (!input.jettyId?.trim()) throw new Error("Handler needs a jetty.");
    const displayName =
      input.handlerDisplayName?.trim() ||
      existingHandler?.displayName ||
      target.name;
    if (existingHandler) {
      await db
        .update(handlers)
        .set({
          jettyId: input.jettyId,
          displayName,
        })
        .where(eq(handlers.id, existingHandler.id));
    } else {
      await db.insert(handlers).values({
        id: id("hdl"),
        userId: input.userId,
        jettyId: input.jettyId,
        displayName,
        mockEarningsCents: 0,
      });
    }
  } else if (existingHandler) {
    await db.delete(handlers).where(eq(handlers.id, existingHandler.id));
  }

  await db
    .update(users)
    .set({ role: input.role })
    .where(eq(users.id, input.userId));

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function actionResetUserPassword(input: {
  userId: string;
  password: string;
}) {
  await requireRole(["ADMIN"]);
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!target) throw new Error("User not found.");

  const passwordHash = await bcrypt.hash(input.password, 10);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, input.userId));

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function actionSetAccountStatus(input: {
  userId: string;
  status: AccountStatus;
  reason: string;
}) {
  const session = await requireRole(["ADMIN"]);
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason is required.");
  if (!["ACTIVE", "SUSPENDED", "BLACKLISTED"].includes(input.status)) {
    throw new Error("Invalid status.");
  }
  if (input.userId === session.user.id) {
    throw new Error("You cannot change your own account status.");
  }

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!target) throw new Error("User not found.");

  await db
    .update(users)
    .set({ accountStatus: input.status })
    .where(eq(users.id, input.userId));

  if (input.status === "ACTIVE") {
    await db
      .update(accountBlocks)
      .set({ liftedAt: new Date() })
      .where(
        and(
          eq(accountBlocks.userId, input.userId),
          sql`${accountBlocks.liftedAt} is null`,
        ),
      );
  } else {
    await db.insert(accountBlocks).values({
      id: id("blk"),
      userId: input.userId,
      kind: input.status === "BLACKLISTED" ? "BLACKLIST" : "SUSPEND",
      reason,
      createdBy: session.user.id,
    });
  }

  await writeAudit({
    actorId: session.user.id,
    action: "user.account_status",
    entityType: "user",
    entityId: input.userId,
    prev: { status: target.accountStatus },
    next: { status: input.status, reason },
  });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function actionUpsertBoatOwner(input: {
  id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  jettyId: string;
  myKadLast4?: string;
}) {
  const session = await requireRole(["ADMIN"]);
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  if (!name || !email || !input.jettyId) {
    throw new Error("Name, email, and jetty are required.");
  }

  if (input.id) {
    const [owner] = await db
      .select()
      .from(boatOwners)
      .where(eq(boatOwners.id, input.id))
      .limit(1);
    if (!owner) throw new Error("Owner not found.");
    await db
      .update(boatOwners)
      .set({
        name,
        jettyId: input.jettyId,
        contactPhone: input.phone?.trim() || null,
        contactEmail: email,
        myKadLast4: input.myKadLast4?.trim() || null,
      })
      .where(eq(boatOwners.id, input.id));
    if (owner.userId) {
      await db
        .update(users)
        .set({ name, phone: input.phone?.trim() || null })
        .where(eq(users.id, owner.userId));
    }
    await writeAudit({
      actorId: session.user.id,
      action: "boat_owner.update",
      entityType: "boat_owner",
      entityId: input.id,
    });
  } else {
    if (!input.password || input.password.length < 8) {
      throw new Error("Password (8+) required for new owner account.");
    }
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) throw new Error("Email already in use.");

    const userId = id("usr");
    await db.insert(users).values({
      id: userId,
      name,
      email,
      phone: input.phone?.trim() || null,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: "USER",
      citizenship: "MY",
    });
    const ownerId = id("own");
    await db.insert(boatOwners).values({
      id: ownerId,
      userId,
      jettyId: input.jettyId,
      name,
      contactPhone: input.phone?.trim() || null,
      contactEmail: email,
      myKadLast4: input.myKadLast4?.trim() || null,
      active: true,
    });
    await writeAudit({
      actorId: session.user.id,
      action: "boat_owner.create",
      entityType: "boat_owner",
      entityId: ownerId,
    });
  }
  revalidatePath("/admin/boats");
  revalidatePath("/admin/operators");
  return { ok: true as const };
}

export async function actionUpsertAdminBoat(input: {
  id?: string;
  name: string;
  registration?: string;
  ownerId: string;
  jettyId: string;
  handlerId?: string | null;
  capacity: number;
  status: BoatStatus;
  permitExpiresAt?: string | null;
  licenceInfo?: string;
}) {
  const session = await requireRole(["ADMIN"]);
  if (!input.name.trim() || !input.ownerId || !input.jettyId) {
    throw new Error("Name, owner, and jetty are required.");
  }
  if (input.capacity < 1 || input.capacity > 50) {
    throw new Error("Capacity must be 1–50.");
  }
  const permitExpiresAt = input.permitExpiresAt
    ? new Date(input.permitExpiresAt)
    : null;
  let status = input.status;
  if (
    status === "ACTIVE" &&
    permitExpiresAt &&
    permitExpiresAt.getTime() < Date.now()
  ) {
    status = "PERMIT_EXPIRED";
  }
  const active = isBoatOperational(status, permitExpiresAt);

  if (input.id) {
    await db
      .update(boats)
      .set({
        name: input.name.trim(),
        registration: input.registration?.trim() || null,
        ownerId: input.ownerId,
        jettyId: input.jettyId,
        handlerId: input.handlerId || null,
        capacity: input.capacity,
        status,
        active,
        permitExpiresAt,
        licenceInfo: input.licenceInfo?.trim() || null,
      })
      .where(eq(boats.id, input.id));
    await writeAudit({
      actorId: session.user.id,
      action: "boat.update",
      entityType: "boat",
      entityId: input.id,
      next: { status },
    });
  } else {
    const boatId = id("bot");
    await db.insert(boats).values({
      id: boatId,
      name: input.name.trim(),
      registration: input.registration?.trim() || null,
      ownerId: input.ownerId,
      jettyId: input.jettyId,
      handlerId: input.handlerId || null,
      capacity: input.capacity,
      status,
      active,
      permitExpiresAt,
      licenceInfo: input.licenceInfo?.trim() || null,
      pricePerPersonCents: 0,
    });
    await writeAudit({
      actorId: session.user.id,
      action: "boat.create",
      entityType: "boat",
      entityId: boatId,
      next: { status },
    });
  }
  revalidatePath("/admin/boats");
  return { ok: true as const };
}

export async function actionLinkHandlerToOwner(input: {
  handlerId: string;
  boatOwnerId: string;
}) {
  const session = await requireRole(["ADMIN"]);
  await db
    .update(handlers)
    .set({ boatOwnerId: input.boatOwnerId })
    .where(eq(handlers.id, input.handlerId));
  await writeAudit({
    actorId: session.user.id,
    action: "handler.link_owner",
    entityType: "handler",
    entityId: input.handlerId,
    next: { boatOwnerId: input.boatOwnerId },
  });
  revalidatePath("/admin/operators");
  return { ok: true as const };
}

export async function actionResolveAlert(alertId: string) {
  const session = await requireRole(["ADMIN"]);
  await db
    .update(alerts)
    .set({ resolvedAt: new Date() })
    .where(eq(alerts.id, alertId));
  await writeAudit({
    actorId: session.user.id,
    action: "alert.resolve",
    entityType: "alert",
    entityId: alertId,
  });
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/ops");
  return { ok: true as const };
}

export async function actionCreateIncident(input: {
  type: string;
  description: string;
  passId?: string;
  pillarId?: string;
}) {
  const session = await requireRole(["ADMIN"]);
  const type = input.type.trim();
  const description = input.description.trim();
  if (!type || !description) {
    throw new Error("Type and description are required.");
  }
  const incidentId = id("inc");
  await db.insert(incidents).values({
    id: incidentId,
    type,
    description,
    status: "OPEN",
    passId: input.passId || null,
    pillarId: input.pillarId || null,
  });
  await writeAudit({
    actorId: session.user.id,
    action: "incident.create",
    entityType: "incident",
    entityId: incidentId,
    next: { type, status: "OPEN" },
  });
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/ops");
  return { ok: true as const, id: incidentId };
}

export async function actionUpdateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
) {
  const session = await requireRole(["ADMIN"]);
  await db
    .update(incidents)
    .set({ status, updatedAt: new Date() })
    .where(eq(incidents.id, incidentId));
  await writeAudit({
    actorId: session.user.id,
    action: "incident.status",
    entityType: "incident",
    entityId: incidentId,
    next: { status },
  });
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/ops");
  return { ok: true as const };
}


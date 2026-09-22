import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  alerts,
  boats,
  incidents,
  jetties,
  locations,
  passes,
  payments,
  settings,
  users,
} from "@/db/schema";
import { isOverdue, PASS_OCCUPANCY_STATUSES } from "@/domain/pass";
import {
  DEFAULT_OVERDUE_HOURS,
  todayMYT,
} from "@/lib/utils-app";

async function overdueHoursFromSettings() {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "overdue_hours"))
    .limit(1);
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_OVERDUE_HOURS;
}

export async function getDashboardMetrics() {
  const validOn = todayMYT();
  const overdueHours = await overdueHoursFromSettings();

  const todayPasses = await db
    .select()
    .from(passes)
    .where(eq(passes.validOn, validOn));

  const sold = todayPasses.filter((p) =>
    ["ACTIVE", "CHECKED_IN", "CHECKED_OUT"].includes(p.status),
  );
  const checkedIn = todayPasses.filter((p) => p.status === "CHECKED_IN");
  const returned = todayPasses.filter((p) => p.status === "CHECKED_OUT");

  const pillars = await db
    .select({
      id: locations.id,
      number: locations.number,
      side: locations.side,
      name: locations.name,
      status: locations.status,
      maxOccupancy: locations.maxOccupancy,
      jettyId: locations.jettyId,
      jettyName: jetties.name,
    })
    .from(locations)
    .innerJoin(jetties, eq(locations.jettyId, jetties.id))
    .where(eq(jetties.active, true));
  const openPillars = pillars.filter((p) => p.status === "AVAILABLE");
  const closedPillars = pillars.filter((p) => p.status !== "AVAILABLE");
  const totalSlots = openPillars.reduce((sum, p) => sum + p.maxOccupancy, 0);
  const occupiedSlots = todayPasses.filter((p) =>
    ["PENDING_PAYMENT", "ACTIVE", "CHECKED_IN"].includes(p.status),
  ).length;
  const availableSlots = Math.max(0, totalSlots - occupiedSlots);

  const boatRows = await db
    .select({
      id: boats.id,
      active: boats.active,
    })
    .from(boats)
    .innerJoin(jetties, eq(boats.jettyId, jetties.id))
    .where(eq(jetties.active, true));
  const activeBoats = boatRows.filter((b) => b.active).length;

  const paid = await db
    .select({
      amount: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .where(
      and(eq(passes.validOn, validOn), eq(payments.status, "PAID")),
    );
  const collectionCents = Number(paid[0]?.amount ?? 0);

  const allCheckedIn = await db
    .select()
    .from(passes)
    .where(eq(passes.status, "CHECKED_IN"));

  const stillUnderBridge = allCheckedIn.filter((p) =>
    isOverdue(p.checkedInAt, overdueHours),
  );

  const openAlerts = await db
    .select()
    .from(alerts)
    .where(isNull(alerts.resolvedAt))
    .orderBy(asc(alerts.createdAt));

  const activeIncidents = await db
    .select()
    .from(incidents)
    .where(inArray(incidents.status, ["OPEN", "IN_PROGRESS"]))
    .orderBy(asc(incidents.createdAt));

  // Occupied first, unique GT/SP labels (not raw P1 from every jetty)
  const pillarOcc = new Map<string, number>();
  for (const p of todayPasses) {
    if (PASS_OCCUPANCY_STATUSES.includes(p.status)) {
      pillarOcc.set(p.pillarId, (pillarOcc.get(p.pillarId) ?? 0) + 1);
    }
  }
  const pillarBars = openPillars
    .map((p) => ({
      id: p.id,
      label: pillarBarLabel(p.side, p.number),
      name: p.name,
      occupied: pillarOcc.get(p.id) ?? 0,
      max: p.maxOccupancy,
      status: p.status,
    }))
    .sort((a, b) => b.occupied - a.occupied || a.label.localeCompare(b.label));

  const occupiedPillars = openPillars.filter(
    (p) => (pillarOcc.get(p.id) ?? 0) > 0,
  ).length;
  const availablePillars = openPillars.length - occupiedPillars;

  // Hourly sales (activatedAt hour)
  const hourly = Array.from({ length: 13 }, (_, i) => ({
    hour: 6 + i,
    count: 0,
  }));
  for (const p of sold) {
    if (!p.activatedAt) continue;
    const h = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "numeric",
        hour12: false,
      }).format(p.activatedAt),
    );
    const slot = hourly.find((x) => x.hour === h);
    if (slot) slot.count += 1;
  }
  let cum = 0;
  const salesSeries = hourly.map((h) => {
    cum += h.count;
    return { ...h, cumulative: cum };
  });

  const overdueRows = [];
  for (const p of stillUnderBridge) {
    const [u] = await db
      .select({ name: users.name, myKadLast4: users.myKadLast4 })
      .from(users)
      .where(eq(users.id, p.userId))
      .limit(1);
    const [pillar] = await db
      .select({
        name: locations.name,
        number: locations.number,
        side: locations.side,
      })
      .from(locations)
      .where(eq(locations.id, p.pillarId))
      .limit(1);
    const mins = p.checkedInAt
      ? Math.floor((Date.now() - p.checkedInAt.getTime()) / 60_000)
      : 0;
    overdueRows.push({
      name: u?.name ?? "—",
      myKadLast4: u?.myKadLast4 ?? "—",
      pillar: pillar ? pillarBarLabel(pillar.side, pillar.number) : "—",
      checkIn: p.checkedInAt?.toISOString() ?? null,
      durationMin: mins,
      boatId: p.boatId,
      passId: p.id,
    });
  }

  const checkedInRows = [];
  for (const p of checkedIn) {
    const [u] = await db
      .select({ name: users.name, myKadLast4: users.myKadLast4 })
      .from(users)
      .where(eq(users.id, p.userId))
      .limit(1);
    const [pillar] = await db
      .select({
        name: locations.name,
        number: locations.number,
        side: locations.side,
      })
      .from(locations)
      .where(eq(locations.id, p.pillarId))
      .limit(1);
    const mins = p.checkedInAt
      ? Math.floor((Date.now() - p.checkedInAt.getTime()) / 60_000)
      : 0;
    checkedInRows.push({
      name: u?.name ?? "—",
      myKadLast4: u?.myKadLast4 ?? "—",
      pillar: pillar ? pillarBarLabel(pillar.side, pillar.number) : "—",
      boat: p.boatId ? p.boatId.slice(0, 8) : "—",
      checkIn: p.checkedInAt?.toISOString() ?? null,
      durationMin: mins,
      overdue: isOverdue(p.checkedInAt, overdueHours),
    });
  }

  // 7-day angler trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = todayMYT(d);
    const dayPasses = await db
      .select()
      .from(passes)
      .where(eq(passes.validOn, day));
    trend.push({
      day,
      checkedIn: dayPasses.filter((p) =>
        ["CHECKED_IN", "CHECKED_OUT"].includes(p.status),
      ).length,
      returned: dayPasses.filter((p) => p.status === "CHECKED_OUT").length,
      overdue: dayPasses.filter(
        (p) =>
          p.status === "CHECKED_IN" &&
          isOverdue(p.checkedInAt, overdueHours),
      ).length,
    });
  }

  return {
    validOn,
    now: new Date().toISOString(),
    passesSoldToday: sold.length,
    currentCheckedIn: checkedIn.length,
    anglersReturned: returned.length,
    availableSlots,
    totalSlots,
    openPillarCount: openPillars.length,
    totalPillarCount: pillars.length,
    activeBoats,
    totalBoats: boatRows.length,
    collectionCents,
    stillUnderBridgeCount: stillUnderBridge.length,
    overdueHours,
    activeAlerts: openAlerts.length,
    activeIncidents: activeIncidents.length,
    pillarBars,
    pillarStatus: {
      occupied: occupiedPillars,
      available: availablePillars,
      closed: closedPillars.length,
      total: pillars.length,
    },
    boatStatus: {
      active: activeBoats,
      inactive: boatRows.length - activeBoats,
      total: boatRows.length,
    },
    salesSeries,
    overdueRows,
    checkedInRows,
    alerts: openAlerts.slice(0, 5),
    incidents: activeIncidents.slice(0, 5),
    trend,
  };
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function pillarBarLabel(side: string, number: number) {
  if (side === "GEORGETOWN") return `GT${number}`;
  if (side === "SEBERANG_PERAI") return `SP${number}`;
  return `P${number}`;
}

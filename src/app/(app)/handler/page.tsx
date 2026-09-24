import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import {
  handlers,
  jetties,
  locations,
  passes,
  scanEvents,
  users,
} from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addCalendarDays, todayMYT } from "@/lib/utils-app";
import { getTranslator } from "@/i18n";
import { SoftLiveRefresh } from "@/components/soft-live-refresh";
import { HandlerTodayPanel } from "@/components/handler/handler-today-panel";

/** MYT calendar day as UTC Date bounds (Malaysia is UTC+8, no DST). */
function mytDayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+08:00`);
  const end = new Date(`${addCalendarDays(dateStr, 1)}T00:00:00+08:00`);
  return { start, end };
}

export default async function HandlerHomePage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const { t } = await getTranslator();
  const [handler] = await db
    .select({
      id: handlers.id,
      displayName: handlers.displayName,
      jettyId: handlers.jettyId,
      jettyName: jetties.name,
    })
    .from(handlers)
    .leftJoin(jetties, eq(handlers.jettyId, jetties.id))
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler && session.user.role === "HANDLER") {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("handler.noProfile")}</AlertTitle>
        <AlertDescription>{t("handler.noProfileHint")}</AlertDescription>
      </Alert>
    );
  }

  if (handler && !handler.jettyId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Operator jetty missing</AlertTitle>
        <AlertDescription>
          Your operator profile has no jetty. Ask Association Admin to assign
          one.
        </AlertDescription>
      </Alert>
    );
  }

  const jettyId = handler?.jettyId;
  const today = todayMYT();
  const { start: dayStart, end: dayEnd } = mytDayBounds(today);

  const rows = jettyId
    ? await db
        .select({
          id: passes.id,
          reference: passes.reference,
          status: passes.status,
          validOn: passes.validOn,
          anglerName: users.name,
          pillarName: locations.name,
          checkedInAt: passes.checkedInAt,
        })
        .from(passes)
        .innerJoin(users, eq(passes.userId, users.id))
        .innerJoin(locations, eq(passes.pillarId, locations.id))
        .where(
          and(
            eq(passes.jettyId, jettyId),
            or(
              and(
                eq(passes.validOn, today),
                inArray(passes.status, [
                  "ACTIVE",
                  "CHECKED_IN",
                  "CHECKED_OUT",
                  "PENDING_PAYMENT",
                ]),
              ),
              eq(passes.status, "CHECKED_IN"),
            ),
          ),
        )
        .orderBy(desc(passes.updatedAt))
        .limit(50)
    : [];

  const checkedInCount = rows.filter((r) => r.status === "CHECKED_IN").length;

  let scannedInCount = 0;
  let scannedOutCount = 0;
  if (handler?.id) {
    const [inRow] = await db
      .select({
        count: sql<number>`count(distinct ${scanEvents.passId})::int`,
      })
      .from(scanEvents)
      .where(
        and(
          eq(scanEvents.handlerId, handler.id),
          eq(scanEvents.type, "CHECK_IN"),
          gte(scanEvents.scannedAt, dayStart),
          lt(scanEvents.scannedAt, dayEnd),
        ),
      );
    const [outRow] = await db
      .select({
        count: sql<number>`count(distinct ${scanEvents.passId})::int`,
      })
      .from(scanEvents)
      .where(
        and(
          eq(scanEvents.handlerId, handler.id),
          eq(scanEvents.type, "CHECK_OUT"),
          gte(scanEvents.scannedAt, dayStart),
          lt(scanEvents.scannedAt, dayEnd),
        ),
      );
    scannedInCount = Number(inRow?.count ?? 0);
    scannedOutCount = Number(outRow?.count ?? 0);
  }

  const subtitle = handler
    ? `${handler.displayName} · ${handler.jettyName} · ${today}`
    : t("handler.adminView", { date: today });

  return (
    <div className="flex w-full flex-col gap-6">
      <SoftLiveRefresh intervalMs={45_000} />
      <HandlerTodayPanel
        subtitle={subtitle}
        checkedInCount={checkedInCount}
        scannedInCount={scannedInCount}
        scannedOutCount={scannedOutCount}
        rows={rows.map((r) => ({
          id: r.id,
          reference: r.reference,
          status: r.status,
          validOn: r.validOn,
          anglerName: r.anglerName,
          pillarName: r.pillarName,
          checkedInAt: r.checkedInAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}

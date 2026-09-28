import { and, asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, jetties, locations, passes, users } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SoftLiveRefresh } from "@/components/soft-live-refresh";
import {
  HandlerPillarsPanel,
  type HandlerPillarRow,
} from "@/components/handler/handler-pillars-panel";
import { getTranslator } from "@/i18n";

export default async function HandlerPillarsPage() {
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
        <AlertTitle>{t("handler.noJettyTitle")}</AlertTitle>
        <AlertDescription>{t("handler.noJettyBody")}</AlertDescription>
      </Alert>
    );
  }

  const jettyId = handler?.jettyId;
  if (!jettyId) {
    return (
      <Alert>
        <AlertTitle>{t("handler.pillarsAdminPick")}</AlertTitle>
        <AlertDescription>{t("handler.pillarsAdminPickHint")}</AlertDescription>
      </Alert>
    );
  }

  const pillarRows = await db
    .select({
      id: locations.id,
      name: locations.name,
      number: locations.number,
      side: locations.side,
      status: locations.status,
      maxOccupancy: locations.maxOccupancy,
    })
    .from(locations)
    .where(eq(locations.jettyId, jettyId))
    .orderBy(asc(locations.side), asc(locations.number));

  const occupants = await db
    .select({
      passId: passes.id,
      pillarId: passes.pillarId,
      reference: passes.reference,
      anglerName: users.name,
      checkedInAt: passes.checkedInAt,
    })
    .from(passes)
    .innerJoin(users, eq(passes.userId, users.id))
    .where(and(eq(passes.jettyId, jettyId), eq(passes.status, "CHECKED_IN")));

  const byPillar = new Map<string, typeof occupants>();
  for (const o of occupants) {
    if (!o.pillarId) continue;
    const list = byPillar.get(o.pillarId) ?? [];
    list.push(o);
    byPillar.set(o.pillarId, list);
  }

  const pillars: HandlerPillarRow[] = pillarRows.map((p) => ({
    id: p.id,
    name: p.name,
    number: p.number,
    side: p.side,
    status: p.status,
    maxOccupancy: p.maxOccupancy,
    occupants: (byPillar.get(p.id) ?? []).map((o) => ({
      passId: o.passId,
      reference: o.reference,
      anglerName: o.anglerName ?? "—",
      checkedInAt: o.checkedInAt?.toISOString() ?? null,
    })),
  }));

  pillars.sort((a, b) => {
    const ao = a.occupants.length > 0 ? 0 : 1;
    const bo = b.occupants.length > 0 ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return 0;
  });

  const subtitle = handler?.jettyName
    ? handler.jettyName
    : t("handler.pillarsSub");

  return (
    <>
      <SoftLiveRefresh intervalMs={45_000} />
      <HandlerPillarsPanel subtitle={subtitle} pillars={pillars} />
    </>
  );
}

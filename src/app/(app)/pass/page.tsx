import { and, asc, eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { jetties, passes, users } from "@/db/schema";
import { listOpenPillarsForJetty } from "@/lib/pass";
import { PassWizard } from "@/components/pass/pass-wizard";
import { canBuyMultiplePassesToday, canBypassPassGeofence, todayMYT } from "@/lib/utils-app";
import { PASS_BLOCKING_STATUSES } from "@/domain/pass";
import { getTranslator } from "@/i18n";

export default async function PassPage() {
  const session = await requireRole(["USER", "ADMIN"]);
  const { t } = await getTranslator();
  const allowMultipleSameDay = canBuyMultiplePassesToday(session.user.email);
  const bypassGeofence = canBypassPassGeofence(session.user.email);

  const [profile] = await db
    .select({ photoKey: users.photoKey })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const hasIdentityPhoto =
    Boolean(profile?.photoKey) || bypassGeofence;

  const jettyRows = await db
    .select()
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder));

  const pillarsByJetty: Record<
    string,
    {
      id: string;
      name: string;
      number: number;
      side: string;
      remaining: number;
      held: number;
      maxOccupancy: number;
    }[]
  > = {};
  for (const j of jettyRows) {
    const pillars = await listOpenPillarsForJetty(j.id);
    pillarsByJetty[j.id] = pillars.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      side: p.side,
      remaining: p.remaining,
      held: p.held,
      maxOccupancy: p.maxOccupancy,
    }));
  }

  const validOn = todayMYT();
  // Resume unpaid hold; for multi-pass demo accounts, do not block the wizard.
  const [todayPass] = allowMultipleSameDay
    ? await db
        .select({
          id: passes.id,
          status: passes.status,
          reference: passes.reference,
          reservedUntil: passes.reservedUntil,
        })
        .from(passes)
        .where(
          and(
            eq(passes.userId, session.user.id),
            eq(passes.validOn, validOn),
            eq(passes.status, "PENDING_PAYMENT"),
          ),
        )
        .limit(1)
    : await db
        .select({
          id: passes.id,
          status: passes.status,
          reference: passes.reference,
          reservedUntil: passes.reservedUntil,
        })
        .from(passes)
        .where(
          and(
            eq(passes.userId, session.user.id),
            eq(passes.validOn, validOn),
            inArray(passes.status, [
              ...PASS_BLOCKING_STATUSES,
              "PENDING_PAYMENT",
            ]),
          ),
        )
        .limit(1);

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 lg:max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pass.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pass.subtitle")}</p>
      </div>
      <PassWizard
        jetties={jettyRows.map((j) => ({
          id: j.id,
          name: j.name,
          area: j.area,
          lat: j.lat,
          lng: j.lng,
          geofenceRadiusM: j.geofenceRadiusM,
        }))}
        pillarsByJetty={pillarsByJetty}
        allowMultipleSameDay={allowMultipleSameDay}
        bypassGeofence={bypassGeofence}
        hasIdentityPhoto={hasIdentityPhoto}
        todayPass={
          todayPass
            ? {
                id: todayPass.id,
                status: todayPass.status,
                reference: todayPass.reference,
                reservedUntil: todayPass.reservedUntil
                  ? todayPass.reservedUntil.toISOString()
                  : null,
              }
            : null
        }
      />
    </div>
  );
}

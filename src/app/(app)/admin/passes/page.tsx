import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { passes, users, locations, jetties } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PassesAdminTable } from "@/components/admin/passes-admin-table";
import { SoftLiveRefresh } from "@/components/soft-live-refresh";
import { getTranslator } from "@/i18n";

export default async function AdminPassesPage() {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
  const rows = await db
    .select({
      id: passes.id,
      reference: passes.reference,
      status: passes.status,
      validOn: passes.validOn,
      feeCents: passes.feeCents,
      angler: users.name,
      pillar: locations.name,
      jetty: jetties.name,
    })
    .from(passes)
    .leftJoin(users, eq(passes.userId, users.id))
    .leftJoin(locations, eq(passes.pillarId, locations.id))
    .leftJoin(jetties, eq(passes.jettyId, jetties.id))
    .orderBy(desc(passes.createdAt))
    .limit(500);

  return (
    <div className="space-y-4">
      <SoftLiveRefresh intervalMs={60_000} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.passesTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("admin.passesSub")}</p>
      </div>
      <PassesAdminTable rows={rows} />
    </div>
  );
}

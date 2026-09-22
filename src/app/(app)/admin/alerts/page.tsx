import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { alerts, incidents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { refreshOpsAlerts } from "@/lib/ops-alerts";
import { AlertsIncidentsPanel } from "@/components/admin/alerts-incidents-panel";
import { getTranslator } from "@/i18n";

export default async function AdminAlertsPage() {
  await requireRole(["ADMIN"]);
  await refreshOpsAlerts();
  const { t } = await getTranslator();

  const alertRows = await db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(100);
  const incidentRows = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.alertsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("admin.alertsSub")}</p>
      </div>
      <AlertsIncidentsPanel
        alerts={alertRows.map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          description: a.description,
          resolvedAt: a.resolvedAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        }))}
        incidents={incidentRows.map((i) => ({
          id: i.id,
          type: i.type,
          description: i.description,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
          updatedAt: i.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

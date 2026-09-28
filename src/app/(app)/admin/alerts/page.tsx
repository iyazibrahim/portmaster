import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { alerts, incidents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { refreshOpsAlerts } from "@/lib/ops-alerts";
import { actionListScanConflicts } from "@/lib/actions/offline";
import { AlertsIncidentsPanel } from "@/components/admin/alerts-incidents-panel";
import { SyncConflictsPanel } from "@/components/admin/sync-conflicts-panel";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { getTranslator } from "@/i18n";

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "sync" ? "sync" : "alerts";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("admin.alertsHubTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("admin.alertsHubSub")}
        </p>
      </div>

      <AdminPageTabs
        tabs={[
          {
            href: "/admin/alerts",
            label: t("nav.alerts"),
            active: tab === "alerts",
          },
          {
            href: "/admin/alerts?tab=sync",
            label: t("nav.syncConflicts"),
            active: tab === "sync",
          },
        ]}
      />

      {tab === "sync" ? <SyncSection /> : <AlertsSection />}
    </div>
  );
}

async function AlertsSection() {
  await refreshOpsAlerts();

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
  );
}

async function SyncSection() {
  const conflicts = await actionListScanConflicts();
  return <SyncConflictsPanel conflicts={conflicts} />;
}

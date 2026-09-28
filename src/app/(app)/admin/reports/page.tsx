import { asc, desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { auditLogs, jetties, reports, users } from "@/db/schema";
import { ReportsPanel } from "@/components/admin/reports-panel";
import { AuditAdminTable } from "@/components/admin/audit-admin-table";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import {
  formatAuditAction,
  formatAuditEntity,
  formatAuditWhen,
} from "@/lib/audit";
import { getTranslator } from "@/i18n";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "audit" ? "audit" : "reports";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("admin.insightsTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("admin.insightsSub")}
        </p>
      </div>

      <AdminPageTabs
        tabs={[
          {
            href: "/admin/reports",
            label: t("nav.reports"),
            active: tab === "reports",
          },
          {
            href: "/admin/reports?tab=audit",
            label: t("nav.audit"),
            active: tab === "audit",
          },
        ]}
      />

      {tab === "audit" ? <AuditSection /> : <ReportsSection />}
    </div>
  );
}

async function ReportsSection() {
  const history = await db
    .select({
      id: reports.id,
      type: reports.type,
      title: reports.title,
      periodStart: reports.periodStart,
      periodEnd: reports.periodEnd,
      summaryJson: reports.summaryJson,
      csvContent: reports.csvContent,
      generatedAt: reports.generatedAt,
    })
    .from(reports)
    .orderBy(desc(reports.generatedAt))
    .limit(30);

  const jettyRows = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  return (
    <ReportsPanel
      jetties={jettyRows}
      history={history.map((h) => ({
        ...h,
        generatedAt: h.generatedAt.toISOString(),
      }))}
    />
  );
}

async function AuditSection() {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <AuditAdminTable
      rows={rows.map((r) => ({
        id: r.id,
        when: formatAuditWhen(r.createdAt),
        who: r.actorName ?? "System",
        whoEmail: r.actorEmail ?? null,
        action: formatAuditAction(r.action),
        entity: formatAuditEntity(r.entityType),
        reference: r.entityId ?? "—",
      }))}
    />
  );
}

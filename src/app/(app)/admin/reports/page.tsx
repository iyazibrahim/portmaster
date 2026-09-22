import { asc, desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { jetties, reports } from "@/db/schema";
import { ReportsPanel } from "@/components/admin/reports-panel";
import { getTranslator } from "@/i18n";

export default async function AdminReportsPage() {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.reportsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("admin.reportsSub")}</p>
      </div>
      <ReportsPanel
        jetties={jettyRows}
        history={history.map((h) => ({
          ...h,
          generatedAt: h.generatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

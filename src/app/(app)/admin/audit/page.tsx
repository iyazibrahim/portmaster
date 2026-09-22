import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  formatAuditAction,
  formatAuditEntity,
  formatAuditWhen,
} from "@/lib/audit";
import { AuditAdminTable } from "@/components/admin/audit-admin-table";
import { getTranslator } from "@/i18n";

export default async function AdminAuditPage() {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.auditTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("admin.auditSub")}
        </p>
      </div>
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
    </div>
  );
}

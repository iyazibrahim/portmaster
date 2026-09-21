import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatAuditAction,
  formatAuditEntity,
  formatAuditWhen,
} from "@/lib/audit";

export default async function AdminAuditPage() {
  await requireRole(["ADMIN"]);
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
    .limit(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who did what, and when — for support and compliance.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No audit events yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatAuditWhen(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.actorName ? (
                        <div>
                          <div className="font-medium">{r.actorName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.actorEmail}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAuditAction(r.action)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAuditEntity(r.entityType)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.entityId ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

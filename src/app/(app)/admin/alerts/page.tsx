import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { alerts, incidents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatEnumLabel } from "@/lib/utils-app";

export default async function AdminAlertsPage() {
  await requireRole(["ADMIN"]);
  const alertRows = await db
    .select()
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(50);
  const incidentRows = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Alerts &amp; Incidents
      </h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts.</p>
            ) : (
              alertRows.map((a) => (
                <div key={a.id} className="rounded border px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.title}</span>
                    <StatusBadge status={a.severity} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.description}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incidentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incidents.</p>
            ) : (
              incidentRows.map((i) => (
                <div key={i.id} className="rounded border px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {formatEnumLabel(i.type)}
                    </span>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {i.description}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

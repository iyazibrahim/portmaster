import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { passes, users, locations, jetties } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPassesPage() {
  await requireRole(["ADMIN"]);
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
    .limit(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Fishing Passes
        </h1>
        <p className="text-sm text-muted-foreground">
          Same-day Association passes (latest 100).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Jetty</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No passes yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.reference}
                    </TableCell>
                    <TableCell>{r.angler}</TableCell>
                    <TableCell>{r.jetty}</TableCell>
                    <TableCell>{r.pillar}</TableCell>
                    <TableCell>{r.validOn}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
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

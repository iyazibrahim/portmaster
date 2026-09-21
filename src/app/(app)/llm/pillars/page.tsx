import { requireRole } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEnumLabel } from "@/lib/utils-app";

export default async function LlmPillarsPage() {
  await requireRole(["LLM_VIEWER", "ADMIN"]);
  const m = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pillar status</h1>
        <p className="text-sm text-muted-foreground">
          View only · occupancy uses per-pillar max.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Available pillars
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.pillarStatus.available}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Occupied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.pillarStatus.occupied}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Not available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.pillarStatus.closed}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top occupied pillars</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pillar</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.pillarBars.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.label} · {p.name}
                  </TableCell>
                  <TableCell>
                    {p.occupied}/{p.max}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatEnumLabel(String(p.status))}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

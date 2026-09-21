import { requireRole } from "@/lib/session";
import {
  formatDuration,
  getDashboardMetrics,
} from "@/lib/dashboard";
import { formatMYR } from "@/lib/utils-app";
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

export default async function LlmAnglersPage() {
  await requireRole(["LLM_VIEWER", "ADMIN"]);
  const m = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Anglers today</h1>
        <p className="text-sm text-muted-foreground">
          View only · {m.passesSoldToday} passes sold · collections{" "}
          {formatMYR(m.collectionCents)}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checked in</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>MyKad</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.checkedInRows.map((r, i) => (
                <TableRow key={`${r.name}-${i}`}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    ****{r.myKadLast4}
                  </TableCell>
                  <TableCell>{r.pillar}</TableCell>
                  <TableCell>
                    {formatDuration(r.durationMin)}
                    {r.overdue ? (
                      <Badge className="ml-2" variant="destructive">
                        Overdue list
                      </Badge>
                    ) : null}
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

import { requireRole } from "@/lib/session";
import {
  formatDuration,
  getDashboardMetrics,
} from "@/lib/dashboard";
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

export default async function LlmOperationsPage() {
  await requireRole(["LLM_VIEWER", "ADMIN"]);
  const m = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Operations overview
        </h1>
        <p className="text-sm text-muted-foreground">
          View only · checked-in anglers and overdue list (no time limit
          enforced).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checked in now
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.currentCheckedIn}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Still under bridge
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.stillUnderBridgeCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Returned today
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.anglersReturned}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currently checked in</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Angler</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.checkedInRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    None checked in.
                  </TableCell>
                </TableRow>
              ) : (
                m.checkedInRows.map((r, i) => (
                  <TableRow key={`${r.name}-${i}`}>
                    <TableCell>
                      {r.name}
                      <span className="ml-1 font-mono text-xs text-muted-foreground">
                        ****{r.myKadLast4}
                      </span>
                    </TableCell>
                    <TableCell>{r.pillar}</TableCell>
                    <TableCell>{formatDuration(r.durationMin)}</TableCell>
                    <TableCell>
                      {r.overdue ? (
                        <Badge variant="destructive">Overdue list</Badge>
                      ) : (
                        "—"
                      )}
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

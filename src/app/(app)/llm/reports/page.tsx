import { requireRole } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/dashboard";
import { formatMYR } from "@/lib/utils-app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function LlmReportsPage() {
  await requireRole(["LLM_VIEWER", "ADMIN"]);
  const m = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          View only snapshot. Association Admin exports CSV from Reports.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Passes sold today
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.passesSoldToday}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMYR(m.collectionCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Slots free
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {m.availableSlots}/{m.totalSlots}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7-day trend</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Boarded</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Overdue list</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.trend.map((t) => (
                <TableRow key={t.day}>
                  <TableCell>{t.day}</TableCell>
                  <TableCell>{t.checkedIn}</TableCell>
                  <TableCell>{t.returned}</TableCell>
                  <TableCell>{t.overdue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

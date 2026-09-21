import { requireRole } from "@/lib/session";
import {
  formatDuration,
  getDashboardMetrics,
} from "@/lib/dashboard";
import { formatEnumLabel, formatMYR, PILLAR_MAX_PAX } from "@/lib/utils-app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default async function LlmDashboardPage() {
  await requireRole(["LLM_VIEWER", "ADMIN"]);
  const m = await getDashboardMetrics();
  const occupancyPct =
    m.totalSlots > 0
      ? Math.round((m.currentCheckedIn / m.totalSlots) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              LLM Dashboard (View Only)
            </h1>
            <Badge variant="secondary" className="gap-1">
              <Eye className="size-3" />
              View only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of bridge fishing operations — Lembaga
            Lebuhraya Malaysia.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(m.now).toLocaleString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
          })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi
          label="Anglers Currently Checked In"
          value={String(m.currentCheckedIn)}
          sub="Under the bridge"
        />
        <Kpi
          label="Anglers Not Yet Returned"
          value={String(m.currentCheckedIn)}
          sub="Awaiting check-out"
        />
        <Kpi
          label="Active Boats"
          value={`${m.activeBoats}`}
          sub={`of ${m.totalBoats} registered`}
        />
        <Kpi
          label="Pillar Occupancy"
          value={`${m.currentCheckedIn} / ${m.totalSlots}`}
          sub={`${occupancyPct}%`}
        />
        <Kpi
          label="Available Pillar Slots"
          value={String(m.availableSlots)}
          sub={`of ${m.totalSlots}`}
        />
        <Kpi
          label="Fishing Passes Today"
          value={String(m.passesSoldToday)}
          sub={formatMYR(m.collectionCents)}
        />
        <Kpi
          label="Active Alerts"
          value={String(m.activeAlerts)}
          sub="Requires attention"
          danger={m.activeAlerts > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pillar Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.pillarBars.map((b) => {
              const full = b.occupied >= b.max;
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{b.label}</span>
                    <span className={full ? "font-semibold text-red-600" : ""}>
                      {b.occupied}/{b.max}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-sky-100">
                    <div
                      className="bg-sky-700"
                      style={{
                        width: `${(b.occupied / PILLAR_MAX_PAX) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pillar Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-emerald-500"
                style={{
                  width: `${(m.pillarStatus.available / (m.pillarStatus.total || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-amber-400"
                style={{
                  width: `${(m.pillarStatus.occupied / (m.pillarStatus.total || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-red-400"
                style={{
                  width: `${(m.pillarStatus.closed / (m.pillarStatus.total || 1)) * 100}%`,
                }}
              />
            </div>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span>Available</span>
                <span>{m.pillarStatus.available}</span>
              </li>
              <li className="flex justify-between">
                <span>Occupied</span>
                <span>{m.pillarStatus.occupied}</span>
              </li>
              <li className="flex justify-between">
                <span>Closed / Unavailable</span>
                <span>{m.pillarStatus.closed}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Live Location of Active Boats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-b from-sky-100 to-sky-200">
              <div className="absolute inset-x-8 top-1/3 h-2 rounded bg-slate-400/80" />
              <div className="absolute inset-x-16 top-1/2 h-1.5 rounded bg-slate-500/70" />
              <p className="relative z-10 max-w-[14rem] text-center text-xs text-slate-600">
                Map placeholder — live GPS tracking ships in MVP3.
                <br />
                {m.activeBoats} active boats registered.
              </p>
            </div>
            <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
              <span>● Active boat</span>
              <span>○ Bridge pillar</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fishing Pass Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-end gap-1">
              {m.salesSeries.map((s) => (
                <div
                  key={s.hour}
                  className="flex flex-1 flex-col items-center"
                >
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{
                      height: `${Math.max(s.cumulative * 4, s.cumulative ? 4 : 2)}px`,
                    }}
                  />
                  <span className="text-[8px] text-muted-foreground">
                    {s.hour}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {m.passesSoldToday} Total Passes Today ·{" "}
              {formatMYR(m.collectionCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Angler Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              {m.trend.map((t) => (
                <div key={t.day} className="flex items-center gap-2">
                  <span className="w-20 text-muted-foreground">
                    {t.day.slice(5)}
                  </span>
                  <span className="text-emerald-600">In {t.checkedIn}</span>
                  <span className="text-sky-600">Out {t.returned}</span>
                  <span className="text-red-600">Od {t.overdue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts &amp; Incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ...m.alerts.map((a) => ({
                id: a.id,
                time: a.createdAt,
                text: a.title,
                status: a.resolvedAt ? "RESOLVED" : "OPEN",
              })),
              ...m.incidents.map((i) => ({
                id: i.id,
                time: i.createdAt,
                text: i.description,
                status: i.status,
              })),
            ]
              .slice(0, 6)
              .map((row) => (
                <div
                  key={row.id}
                  className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-xs"
                >
                  <div>
                    <p className="font-medium">{row.text}</p>
                    <p className="text-muted-foreground">
                      {new Date(row.time).toLocaleTimeString("en-MY", {
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </p>
                  </div>
                  <StatusBadge
                    status={row.status}
                    label={formatEnumLabel(row.status)}
                    className="min-w-[5.5rem] text-[10px]"
                  />
                </div>
              ))}
            {m.alerts.length + m.incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Currently Checked In Anglers
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>MyKad</TableHead>
                  <TableHead>Pillar</TableHead>
                  <TableHead>Boat</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.checkedInRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No anglers checked in
                    </TableCell>
                  </TableRow>
                ) : (
                  m.checkedInRows.map((r, i) => (
                    <TableRow key={`${r.name}-${i}`}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>****{r.myKadLast4}</TableCell>
                      <TableCell>{r.pillar}</TableCell>
                      <TableCell>{r.boat}</TableCell>
                      <TableCell
                        className={
                          r.overdue ? "font-medium text-red-600" : undefined
                        }
                      >
                        {formatDuration(r.durationMin)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-sky-50">
          <CardContent className="flex h-full flex-col justify-center gap-2 p-6 text-center">
            <p className="text-sm font-semibold text-sky-900">
              Safe Bridges, Sustainable Communities
            </p>
            <p className="text-xs text-sky-800/80">
              Lembaga Lebuhraya Malaysia — Connecting People, Enabling Growth.
            </p>
            <p className="mt-2 text-[10px] text-sky-700/70">
              No administrative functions available.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] leading-tight text-muted-foreground">
          {label}
        </p>
        <p
          className={`text-lg font-semibold tabular-nums ${danger ? "text-red-600" : ""}`}
        >
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

import { requireRole } from "@/lib/session";
import {
  formatDuration,
  getDashboardMetrics,
} from "@/lib/dashboard";
import { formatEnumLabel, formatMYR } from "@/lib/utils-app";
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
import {
  Ticket,
  Users,
  Undo2,
  MapPinned,
  Ship,
  Coins,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminOpsPage() {
  await requireRole(["ADMIN"]);
  const m = await getDashboardMetrics();

  const kpis = [
    {
      label: "Passes Sold Today",
      value: String(m.passesSoldToday),
      sub: "Max today: 50 est.",
      icon: Ticket,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Current Anglers Under Bridge",
      value: String(m.currentCheckedIn),
      sub: "Checked in",
      icon: Users,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Anglers Returned",
      value: String(m.anglersReturned),
      sub: "Checked out today",
      icon: Undo2,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Available Pillar Slots",
      value: String(m.availableSlots),
      sub: `of ${m.totalSlots} total (${m.openPillarCount} open pillars)`,
      icon: MapPinned,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Active Boats",
      value: String(m.activeBoats),
      sub: `of ${m.totalBoats} registered`,
      icon: Ship,
      color: "text-teal-600 bg-teal-50",
    },
    {
      label: "Today's Collection",
      value: formatMYR(m.collectionCents),
      sub: "RM5 per pass",
      icon: Coins,
      color: "text-pink-600 bg-pink-50",
    },
    {
      label: "Overdue Anglers",
      value: String(m.overdueCount),
      sub: "not yet returned",
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Active Alerts",
      value: String(m.activeAlerts),
      sub: "requires attention",
      icon: Bell,
      color: "text-sky-600 bg-sky-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live overview of Jambatan Pulau Pinang fishing operations.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(m.now).toLocaleString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
          })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="overflow-hidden">
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`rounded-lg p-2 ${k.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-semibold tabular-nums">{k.value}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {k.sub}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <OpRow label="Anglers checked in" value={m.currentCheckedIn} />
            <OpRow label="Active boats" value={m.activeBoats} />
            <OpRow
              label="Today's RM5 collections"
              value={formatMYR(m.collectionCents)}
            />
            <OpRow label="Active incidents" value={m.activeIncidents} />
            <p className="pt-2 text-[11px] text-muted-foreground">
              Last updated{" "}
              {new Date(m.now).toLocaleTimeString("en-MY", {
                timeZone: "Asia/Kuala_Lumpur",
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Anglers per Pillar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {m.pillarBars.map((b) => {
                const pct = (b.occupied / b.max) * 100;
                const color =
                  b.occupied >= b.max
                    ? "bg-emerald-600"
                    : b.occupied > 0
                      ? "bg-amber-400"
                      : "bg-muted";
                return (
                  <div
                    key={b.id}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex h-28 w-full items-end rounded bg-muted/40">
                      <div
                        className={`w-full rounded-t ${color}`}
                        style={{ height: `${Math.max(pct, b.occupied ? 12 : 4)}%` }}
                        title={`${b.occupied}/${b.max}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-emerald-600" /> Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-amber-400" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-muted" /> Empty
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DonutCard
          title="Pillar Status"
          total={m.pillarStatus.total}
          slices={[
            {
              label: "Occupied",
              value: m.pillarStatus.occupied,
              color: "bg-amber-400",
            },
            {
              label: "Available",
              value: m.pillarStatus.available,
              color: "bg-emerald-500",
            },
            {
              label: "Closed",
              value: m.pillarStatus.closed,
              color: "bg-slate-300",
            },
          ]}
        />
        <DonutCard
          title="Boats Status"
          total={m.boatStatus.total || 1}
          slices={[
            {
              label: "Active",
              value: m.boatStatus.active,
              color: "bg-teal-500",
            },
            {
              label: "Inactive",
              value: m.boatStatus.inactive,
              color: "bg-slate-300",
            },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Pass Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-1">
              {m.salesSeries.map((s) => (
                <div
                  key={s.hour}
                  className="flex flex-1 flex-col items-center gap-0.5"
                >
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{
                      height: `${Math.max(s.count * 18, s.count ? 6 : 2)}px`,
                    }}
                    title={`${s.hour}:00 · ${s.count}`}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {s.hour}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {m.passesSoldToday} passes · {formatMYR(m.collectionCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Overdue Anglers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Pillar</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.overdueRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      None overdue
                    </TableCell>
                  </TableRow>
                ) : (
                  m.overdueRows.map((r) => (
                    <TableRow key={r.passId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.pillar}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        {formatDuration(r.durationMin)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open alerts.</p>
            ) : (
              m.alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.title}</span>
                    <Badge variant="secondary">{a.type}</Badge>
                  </div>
                  {a.description ? (
                    <p className="text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active incidents.</p>
            ) : (
              m.incidents.map((i) => (
                <div
                  key={i.id}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
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

function OpRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function DonutCard({
  title,
  total,
  slices,
}: {
  title: string;
  total: number;
  slices: { label: string; value: number; color: string }[];
}) {
  const safeTotal = total || 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {slices.map((s) => (
            <div
              key={s.label}
              className={s.color}
              style={{ width: `${(s.value / safeTotal) * 100}%` }}
            />
          ))}
        </div>
        <ul className="space-y-1 text-sm">
          {slices.map((s) => (
            <li key={s.label} className="flex justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={`size-2 rounded-full ${s.color}`} />
                {s.label}
              </span>
              <span className="tabular-nums">
                {s.value} ({Math.round((s.value / safeTotal) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
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
import { PillarBarsCarousel } from "@/components/admin/pillar-bars-carousel";
import { getTranslator } from "@/i18n";

export default async function AdminOpsPage() {
  await requireRole(["ADMIN"]);
  const m = await getDashboardMetrics();
  const { t } = await getTranslator();

  const lastTime = new Date(m.now).toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
  });

  const kpis = [
    {
      id: "passesSold",
      label: t("admin.kpi.passesSold"),
      value: String(m.passesSoldToday),
      sub: t("admin.kpi.passesSoldSub"),
      icon: Ticket,
      color: "text-blue-600 bg-blue-50",
    },
    {
      id: "currentAnglers",
      label: t("admin.kpi.currentAnglers"),
      value: String(m.currentCheckedIn),
      sub: t("admin.kpi.checkedIn"),
      icon: Users,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      id: "returned",
      label: t("admin.kpi.returned"),
      value: String(m.anglersReturned),
      sub: t("admin.kpi.returnedSub"),
      icon: Undo2,
      color: "text-violet-600 bg-violet-50",
    },
    {
      id: "slots",
      label: t("admin.kpi.slots"),
      value: String(m.availableSlots),
      sub: t("admin.kpi.slotsSub", {
        total: m.totalSlots,
        open: m.openPillarCount,
      }),
      icon: MapPinned,
      color: "text-amber-600 bg-amber-50",
    },
    {
      id: "activeBoats",
      label: t("admin.kpi.activeBoats"),
      value: String(m.activeBoats),
      sub: t("admin.kpi.activeBoatsSub", { total: m.totalBoats }),
      icon: Ship,
      color: "text-teal-600 bg-teal-50",
    },
    {
      id: "collection",
      label: t("admin.kpi.collection"),
      value: formatMYR(m.collectionCents),
      sub: t("admin.kpi.collectionSub"),
      icon: Coins,
      color: "text-pink-600 bg-pink-50",
    },
    {
      id: "stillUnder",
      label: t("admin.kpi.stillUnder"),
      value: String(m.stillUnderBridgeCount),
      sub: t("admin.kpi.stillUnderSub", { hours: m.overdueHours }),
      icon: AlertTriangle,
      color: "text-amber-700 bg-amber-50",
    },
    {
      id: "activeAlerts",
      label: t("admin.kpi.activeAlerts"),
      value: String(m.activeAlerts),
      sub: t("admin.kpi.alertsNeed"),
      icon: Bell,
      color: "text-sky-600 bg-sky-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.opsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("admin.opsSub")}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(m.now).toLocaleString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
          })}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.id} className="overflow-hidden">
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
            <CardTitle className="text-base">
              {t("admin.ops.currentOps")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <OpRow
              label={t("admin.ops.anglersIn")}
              value={m.currentCheckedIn}
            />
            <OpRow label={t("admin.ops.activeBoats")} value={m.activeBoats} />
            <OpRow
              label={t("admin.ops.collections")}
              value={formatMYR(m.collectionCents)}
            />
            <OpRow label={t("admin.ops.incidents")} value={m.activeIncidents} />
            <p className="pt-2 text-[11px] text-muted-foreground">
              {t("admin.ops.lastUpdated", { time: lastTime })}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.ops.anglersPerPillar")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PillarBarsCarousel bars={m.pillarBars} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DonutCard
          title={t("admin.ops.pillarStatus")}
          total={m.pillarStatus.total}
          slices={[
            {
              label: t("admin.ops.occupied"),
              value: m.pillarStatus.occupied,
              color: "bg-amber-400",
            },
            {
              label: t("admin.ops.available"),
              value: m.pillarStatus.available,
              color: "bg-emerald-500",
            },
            {
              label: t("admin.ops.closed"),
              value: m.pillarStatus.closed,
              color: "bg-slate-300",
            },
          ]}
        />
        <DonutCard
          title={t("admin.ops.boatsStatus")}
          total={m.boatStatus.total || 1}
          slices={[
            {
              label: t("admin.ops.active"),
              value: m.boatStatus.active,
              color: "bg-teal-500",
            },
            {
              label: t("admin.ops.inactive"),
              value: m.boatStatus.inactive,
              color: "bg-slate-300",
            },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.ops.passSales")}
            </CardTitle>
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
              {t("admin.ops.passSalesFoot", {
                count: m.passesSoldToday,
                amount: formatMYR(m.collectionCents),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {t("admin.ops.stillUnderTitle")}
            </CardTitle>
            <p className="text-xs font-normal text-muted-foreground">
              {t("admin.ops.stillUnderHint", { hours: m.overdueHours })}
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("admin.col.pillar")}</TableHead>
                  <TableHead>{t("admin.col.duration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.overdueRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      {t("admin.ops.noLongStays")}
                    </TableCell>
                  </TableRow>
                ) : (
                  m.overdueRows.map((r) => (
                    <TableRow key={r.passId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.pillar}</TableCell>
                      <TableCell className="font-medium text-amber-800">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t("admin.ops.currentAlerts")}
            </CardTitle>
            <Link
              href="/admin/alerts"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.ops.noAlerts")}
              </p>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t("admin.ops.activeIncidentsTitle")}
            </CardTitle>
            <Link
              href="/admin/alerts"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.ops.noIncidents")}
              </p>
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

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionCreateIncident,
  actionResolveAlert,
  actionUpdateIncidentStatus,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatEnumLabel } from "@/lib/utils-app";
import type { IncidentStatus } from "@/db/schema";
import { toast } from "sonner";

export type AlertRow = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type IncidentRow = {
  id: string;
  type: string;
  description: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
};

const INCIDENT_TYPES = [
  { value: "Medical", label: "Medical" },
  { value: "Safety", label: "Safety" },
  { value: "Dispute", label: "Dispute" },
  { value: "Other", label: "Other" },
];

const NEXT_STATUS: Record<IncidentStatus, IncidentStatus | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: null,
};

export function AlertsIncidentsPanel({
  alerts: initialAlerts,
  incidents: initialIncidents,
}: {
  alerts: AlertRow[];
  incidents: IncidentRow[];
}) {
  const router = useRouter();
  const [alertQuery, setAlertQuery] = useState("");
  const [incidentQuery, setIncidentQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    type: "Safety",
    description: "",
    passId: "",
    pillarId: "",
  });

  const openAlerts = initialAlerts.filter((a) => !a.resolvedAt).length;
  const openIncidents = initialIncidents.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
  ).length;

  const filteredAlerts = useMemo(() => {
    const q = alertQuery.trim().toLowerCase();
    if (!q) return initialAlerts;
    return initialAlerts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.severity.toLowerCase().includes(q),
    );
  }, [initialAlerts, alertQuery]);

  const filteredIncidents = useMemo(() => {
    const q = incidentQuery.trim().toLowerCase();
    if (!q) return initialIncidents;
    return initialIncidents.filter(
      (i) =>
        i.type.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q),
    );
  }, [initialIncidents, incidentQuery]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-xs font-medium text-muted-foreground">
            Open alerts
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {openAlerts}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-xs font-medium text-muted-foreground">
            Open incidents
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {openIncidents}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Alerts</h2>
          <p className="text-sm text-muted-foreground">
            System-generated ops signals. Resolve when handled.
          </p>
        </div>
        <AdminDataTable
          items={filteredAlerts}
          search={alertQuery}
          onSearchChange={setAlertQuery}
          searchPlaceholder="Search alerts…"
          emptyMessage="No alerts."
          pageSize={5}
        >
          {(pageItems) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">When</TableHead>
                  <TableHead className="px-3">Title</TableHead>
                  <TableHead className="px-3">Severity</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3 w-[7rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("en-MY")}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="font-medium">{a.title}</div>
                      {a.description ? (
                        <div className="text-xs text-muted-foreground">
                          {a.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <StatusBadge status={a.severity} />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <StatusBadge
                        status={a.resolvedAt ? "RESOLVED" : "OPEN"}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {!a.resolvedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await actionResolveAlert(a.id);
                              toast.success("Alert resolved");
                              router.refresh();
                            })
                          }
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AdminDataTable>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Incidents
            </h2>
            <p className="text-sm text-muted-foreground">
              Human-logged safety and ops cases.
            </p>
          </div>
          <Button className="min-h-11" onClick={() => setCreateOpen(true)}>
            Log incident
          </Button>
        </div>
        <AdminDataTable
          items={filteredIncidents}
          search={incidentQuery}
          onSearchChange={setIncidentQuery}
          searchPlaceholder="Search incidents…"
          emptyMessage="No incidents."
          pageSize={5}
        >
          {(pageItems) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">When</TableHead>
                  <TableHead className="px-3">Type</TableHead>
                  <TableHead className="px-3">Description</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3 w-[9rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((i) => {
                  const next = NEXT_STATUS[i.status];
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {new Date(i.createdAt).toLocaleString("en-MY")}
                      </TableCell>
                      <TableCell className="px-3 py-2 font-medium">
                        {formatEnumLabel(i.type)}
                      </TableCell>
                      <TableCell className="max-w-[22rem] px-3 py-2 text-sm">
                        {i.description}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <StatusBadge status={i.status} />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {next ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                await actionUpdateIncidentStatus(i.id, next);
                                toast.success(
                                  `Marked ${formatEnumLabel(next)}`,
                                );
                                router.refresh();
                              })
                            }
                          >
                            {next === "IN_PROGRESS"
                              ? "Start"
                              : "Resolve"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Closed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </AdminDataTable>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log incident</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <SearchableSelect
                options={INCIDENT_TYPES}
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea
                className="min-h-24"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What happened, where, who involved…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Pass id (optional)</Label>
                <Input
                  value={form.passId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, passId: e.target.value }))
                  }
                  placeholder="pas_…"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Pillar id (optional)</Label>
                <Input
                  value={form.pillarId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pillarId: e.target.value }))
                  }
                  placeholder="loc_…"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !form.description.trim()}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionCreateIncident({
                      type: form.type,
                      description: form.description,
                      passId: form.passId || undefined,
                      pillarId: form.pillarId || undefined,
                    });
                    toast.success("Incident logged");
                    setCreateOpen(false);
                    setForm({
                      type: "Safety",
                      description: "",
                      passId: "",
                      pillarId: "",
                    });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

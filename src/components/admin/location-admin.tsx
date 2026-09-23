"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionSetLocationStatus,
  actionUpsertLocation,
} from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AdminDataTable,
  ADMIN_CONTROL,
} from "@/components/admin/admin-data-table";
import { StatusBadge } from "@/components/status-badge";
import { sideLabel } from "@/lib/utils-app";
import type { LocationStatus } from "@/db/schema";
import { toast } from "sonner";

export type LocationRow = {
  id: string;
  jettyId: string;
  jettyName: string;
  number: number;
  side: "GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL";
  name: string;
  status: LocationStatus;
  maxOccupancy: number;
  notes: string | null;
};

export type JettyOption = { id: string; name: string };

const SIDE_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "GEORGETOWN", label: "Georgetown" },
  { value: "SEBERANG_PERAI", label: "Seberang Perai" },
] as const;

const STATUS_OPTIONS: { value: LocationStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "TEMPORARILY_CLOSED", label: "Temporarily Closed" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "RESTRICTED", label: "Restricted" },
];

export function LocationAdmin({
  initial,
  jetties,
}: {
  initial: LocationRow[];
  jetties: JettyOption[];
}) {
  const router = useRouter();
  const [jettyFilter, setJettyFilter] = useState("ALL");
  const [sideFilter, setSideFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    jettyId: jetties[0]?.id ?? "",
    number: 1,
    side: "GENERAL" as "GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL",
    name: "",
    status: "AVAILABLE" as LocationStatus,
    maxOccupancy: 4,
    notes: "",
  });

  const jettyOptions = useMemo(
    () => jetties.map((j) => ({ value: j.id, label: j.name })),
    [jetties],
  );

  const filterJettyOptions = useMemo(
    () => [{ value: "ALL", label: "All jetties" }, ...jettyOptions],
    [jettyOptions],
  );

  const sideFilterOptions = useMemo(
    () => [{ value: "ALL", label: "All sides" }, ...SIDE_OPTIONS],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((t) => {
      if (jettyFilter !== "ALL" && t.jettyId !== jettyFilter) return false;
      if (sideFilter !== "ALL" && t.side !== sideFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        String(t.number).includes(q) ||
        t.jettyName.toLowerCase().includes(q)
      );
    });
  }, [initial, jettyFilter, sideFilter, query]);

  function openCreate() {
    setEditId(null);
    setForm({
      jettyId: jetties[0]?.id ?? "",
      number: (initial.at(-1)?.number ?? 0) + 1,
      side: "GENERAL",
      name: "",
      status: "AVAILABLE",
      maxOccupancy: 4,
      notes: "",
    });
    setCreateOpen(true);
  }

  function openEdit(row: LocationRow) {
    setEditId(row.id);
    setForm({
      jettyId: row.jettyId,
      number: row.number,
      side: row.side,
      name: row.name,
      status: row.status,
      maxOccupancy: row.maxOccupancy,
      notes: row.notes ?? "",
    });
    setCreateOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Only <strong>Available</strong> pillars appear in pass purchase. Max
        occupancy is per pillar.
      </p>

      <AdminDataTable
        items={filtered}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Number or name"
        emptyMessage="No pillars match."
        filters={
          <>
            <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-xs">
              <Label>Jetty</Label>
              <SearchableSelect
                options={filterJettyOptions}
                value={jettyFilter}
                onValueChange={setJettyFilter}
                className={ADMIN_CONTROL}
                searchPlaceholder="Search jetty…"
              />
            </div>
            <div className="flex min-w-[10rem] flex-col gap-1.5 sm:max-w-[12rem]">
              <Label>Side</Label>
              <SearchableSelect
                options={sideFilterOptions}
                value={sideFilter}
                onValueChange={setSideFilter}
                className={ADMIN_CONTROL}
              />
            </div>
          </>
        }
        actions={
          <Button className="min-h-11" onClick={openCreate}>
            Add pillar
          </Button>
        }
      >
        {(pageItems) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">#</TableHead>
                <TableHead className="px-3">Name</TableHead>
                <TableHead className="px-3">Jetty</TableHead>
                <TableHead className="px-3">Side</TableHead>
                <TableHead className="px-3">Max</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3 w-[11rem]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="px-3 py-2 tabular-nums">
                    {t.number}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-medium">
                    {t.name}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate px-3 py-2">
                    {t.jettyName}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {sideLabel(t.side)}
                  </TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">
                    {t.maxOccupancy}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={pending}
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const next =
                              t.status === "AVAILABLE"
                                ? "UNAVAILABLE"
                                : "AVAILABLE";
                            await actionSetLocationStatus(t.id, next);
                            toast.success("Status updated");
                            router.refresh();
                          })
                        }
                      >
                        {t.status === "AVAILABLE" ? "Close" : "Open"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataTable>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit pillar" : "Add pillar"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Jetty</Label>
              <SearchableSelect
                options={jettyOptions}
                value={form.jettyId}
                onValueChange={(v) => setForm((f) => ({ ...f, jettyId: v }))}
                placeholder="Select jetty"
                searchPlaceholder="Search jetty…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Number</Label>
              <Input
                type="number"
                className="max-w-xs"
                value={form.number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, number: Number(e.target.value) }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Max occupancy</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.maxOccupancy}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxOccupancy: Number(e.target.value) || 4,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Side</Label>
              <SearchableSelect
                options={[...SIDE_OPTIONS]}
                value={form.side}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    side: v as typeof form.side,
                  }))
                }
                placeholder="Side"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <SearchableSelect
                options={STATUS_OPTIONS}
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as LocationStatus }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="GT Pillar 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !form.name || !form.jettyId}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionUpsertLocation({
                      id: editId ?? undefined,
                      ...form,
                    });
                    toast.success("Pillar saved");
                    setCreateOpen(false);
                    router.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Save pillar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

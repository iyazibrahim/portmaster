"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionToggleJettyActive,
  actionUpsertJetty,
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
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";

export type JettyRow = {
  id: string;
  name: string;
  area: string | null;
  slug: string;
  active: boolean;
  notes: string | null;
  sortOrder: number;
  lat: string | null;
  lng: string | null;
  geofenceRadiusM: number;
  locationCount: number;
  handlerCount: number;
};

type JettyForm = {
  id?: string;
  name: string;
  area: string;
  slug: string;
  notes: string;
  sortOrder: number;
  lat: string;
  lng: string;
  geofenceRadiusM: number;
  active: boolean;
};

const emptyForm = (sortOrder: number): JettyForm => ({
  name: "",
  area: "",
  slug: "",
  notes: "",
  sortOrder,
  lat: "",
  lng: "",
  geofenceRadiusM: 100,
  active: true,
});

function compactGps(lat: string | null, lng: string | null) {
  if (!lat || !lng) return "—";
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return `${lat}, ${lng}`;
  return `${a.toFixed(4)}, ${b.toFixed(4)}`;
}

export function JettyAdmin({ initial }: { initial: JettyRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<JettyForm>(
    emptyForm((initial.at(-1)?.sortOrder ?? 0) + 1),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        (j.area ?? "").toLowerCase().includes(q) ||
        j.slug.toLowerCase().includes(q),
    );
  }, [initial, query]);

  const isEdit = Boolean(form.id);

  function openCreate() {
    setForm(emptyForm((initial.at(-1)?.sortOrder ?? 0) + 1));
    setDialogOpen(true);
  }

  function openEdit(j: JettyRow) {
    setForm({
      id: j.id,
      name: j.name,
      area: j.area ?? "",
      slug: j.slug,
      notes: j.notes ?? "",
      sortOrder: j.sortOrder,
      lat: j.lat ?? "",
      lng: j.lng ?? "",
      geofenceRadiusM: j.geofenceRadiusM || 100,
      active: j.active,
    });
    setDialogOpen(true);
  }

  function save() {
    startTransition(async () => {
      try {
        if (!form.lat.trim() || !form.lng.trim()) {
          throw new Error("Latitude and longitude are required.");
        }
        const lat = Number(form.lat);
        const lng = Number(form.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error("Enter valid GPS coordinates.");
        }
        const radius = Math.round(Number(form.geofenceRadiusM) || 100);
        if (radius < 50 || radius > 2000) {
          throw new Error("Radius must be between 50 and 2000 metres.");
        }
        await actionUpsertJetty({
          id: form.id,
          name: form.name,
          area: form.area || undefined,
          slug: form.slug || undefined,
          notes: form.notes || undefined,
          sortOrder: form.sortOrder,
          active: form.active,
          lat: String(lat),
          lng: String(lng),
          geofenceRadiusM: radius,
        });
        toast.success(isEdit ? "Jetty updated" : "Jetty saved");
        setDialogOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminDataTable
        items={filtered}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search jetties"
        emptyMessage="No jetties match."
        actions={
          <Button className="min-h-11" onClick={openCreate}>
            Add jetty
          </Button>
        }
      >
        {(pageItems) => (
          <Table className="table-fixed w-full min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%] px-3">Name</TableHead>
                <TableHead className="w-[14%] px-3">Area</TableHead>
                <TableHead className="w-[18%] px-3">GPS</TableHead>
                <TableHead className="w-[10%] px-3">Radius</TableHead>
                <TableHead className="w-[10%] px-3">Counts</TableHead>
                <TableHead className="w-[12%] px-3">Status</TableHead>
                <TableHead className="w-[18%] px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="px-3 py-2">
                    <div className="truncate font-medium">{j.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {j.slug}
                    </div>
                  </TableCell>
                  <TableCell className="truncate px-3 py-2">
                    {j.area ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs tabular-nums">
                    {compactGps(j.lat, j.lng)}
                  </TableCell>
                  <TableCell className="px-3 py-2 tabular-nums">
                    {j.geofenceRadiusM} m
                  </TableCell>
                  <TableCell className="px-3 py-2 tabular-nums text-muted-foreground">
                    {j.locationCount} · {j.handlerCount}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <StatusBadge
                      status={j.active ? "ACTIVE" : "INACTIVE"}
                      label={j.active ? "Active" : "Inactive"}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={pending}
                        onClick={() => openEdit(j)}
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
                            await actionToggleJettyActive(j.id);
                            toast.success(
                              j.active
                                ? "Jetty deactivated"
                                : "Jetty activated",
                            );
                            router.refresh();
                          })
                        }
                      >
                        {j.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataTable>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit jetty" : "Add jetty"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Jeti Nelayan…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Area</Label>
              <Input
                value={form.area}
                onChange={(e) =>
                  setForm((f) => ({ ...f, area: e.target.value }))
                }
                placeholder="George Town"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Slug (optional)</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="auto from name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Latitude</Label>
              <Input
                value={form.lat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lat: e.target.value }))
                }
                placeholder="5.3506"
                inputMode="decimal"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Longitude</Label>
              <Input
                value={form.lng}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lng: e.target.value }))
                }
                placeholder="100.3135"
                inputMode="decimal"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Purchase radius (metres)</Label>
              <Input
                type="number"
                min={50}
                max={2000}
                value={form.geofenceRadiusM}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    geofenceRadiusM: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Anglers must be within this distance to buy a pass. Default 100
                m.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                className="max-w-xs"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !form.name.trim()}
              onClick={save}
            >
              {isEdit ? "Save changes" : "Save jetty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  actionUpsertAdminBoat,
  actionUpsertBoatOwner,
} from "@/lib/actions/admin";
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
import type { BoatStatus } from "@/db/schema";
import { StatusBadge } from "@/components/status-badge";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { toast } from "sonner";

type BoatRow = {
  id: string;
  name: string;
  registration: string | null;
  status: BoatStatus;
  capacity: number;
  ownerId: string | null;
  owner: string | null;
  jettyId: string | null;
  jetty: string | null;
  operator: string | null;
  permitExpiresAt: string | null;
};

type OwnerOpt = { id: string; name: string; jettyId: string };
type JettyOpt = { id: string; name: string };
type HandlerOpt = { id: string; name: string; jettyId: string };

const STATUS_OPTS: { value: BoatStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PERMIT_EXPIRED", label: "Permit Expired" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
];

export function AdminBoatsPanel({
  boats: initial,
  owners,
  jetties,
  handlers,
}: {
  boats: BoatRow[];
  owners: OwnerOpt[];
  jetties: JettyOpt[];
  handlers: HandlerOpt[];
}) {
  const [boatOpen, setBoatOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [boatForm, setBoatForm] = useState({
    name: "",
    registration: "",
    ownerId: owners[0]?.id ?? "",
    jettyId: jetties[0]?.id ?? "",
    handlerId: "",
    capacity: 6,
    status: "ACTIVE" as BoatStatus,
    permitExpiresAt: "",
    licenceInfo: "",
  });
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    jettyId: jetties[0]?.id ?? "",
    myKadLast4: "",
  });

  const jettyOptions = useMemo(
    () => jetties.map((j) => ({ value: j.id, label: j.name })),
    [jetties],
  );
  const ownerOptions = useMemo(
    () => owners.map((o) => ({ value: o.id, label: o.name })),
    [owners],
  );
  const handlerOptions = useMemo(
    () => [
      { value: "", label: "— None —" },
      ...handlers.map((h) => ({ value: h.id, label: h.name })),
    ],
    [handlers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.registration ?? "").toLowerCase().includes(q) ||
        (r.owner ?? "").toLowerCase().includes(q) ||
        (r.jetty ?? "").toLowerCase().includes(q) ||
        (r.operator ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [initial, query]);

  function openCreateBoat() {
    setEditId(null);
    setBoatForm({
      name: "",
      registration: "",
      ownerId: owners[0]?.id ?? "",
      jettyId: jetties[0]?.id ?? "",
      handlerId: "",
      capacity: 6,
      status: "ACTIVE",
      permitExpiresAt: "",
      licenceInfo: "",
    });
    setBoatOpen(true);
  }

  function openEditBoat(b: BoatRow) {
    setEditId(b.id);
    setBoatForm({
      name: b.name,
      registration: b.registration ?? "",
      ownerId: b.ownerId ?? owners[0]?.id ?? "",
      jettyId: b.jettyId ?? jetties[0]?.id ?? "",
      handlerId: "",
      capacity: b.capacity,
      status: b.status,
      permitExpiresAt: b.permitExpiresAt?.slice(0, 10) ?? "",
      licenceInfo: "",
    });
    setBoatOpen(true);
  }

  return (
    <div className="space-y-4">
      <AdminDataTable
        items={filtered}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search name, reg, owner, jetty…"
        emptyMessage="No boats match."
        actions={
          <>
            <Button className="min-h-11" onClick={openCreateBoat}>
              Add boat
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setOwnerOpen(true)}
            >
              Register boat owner
            </Button>
          </>
        }
      >
        {(pageItems) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">Name</TableHead>
                <TableHead className="px-3">Reg</TableHead>
                <TableHead className="px-3">Owner</TableHead>
                <TableHead className="px-3">Jetty</TableHead>
                <TableHead className="px-3">Operator</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3 w-[5rem]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-3 py-2 font-medium">
                    {r.name}
                  </TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs">
                    {r.registration ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {r.owner ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate px-3 py-2">
                    {r.jetty ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {r.operator ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => openEditBoat(r)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataTable>

      <Dialog open={boatOpen} onOpenChange={setBoatOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit boat" : "Add boat"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={boatForm.name}
                onChange={(e) =>
                  setBoatForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Registration</Label>
              <Input
                value={boatForm.registration}
                onChange={(e) =>
                  setBoatForm((f) => ({ ...f, registration: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input
                type="number"
                value={boatForm.capacity}
                onChange={(e) =>
                  setBoatForm((f) => ({
                    ...f,
                    capacity: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <SearchableSelect
                options={ownerOptions}
                value={boatForm.ownerId}
                onValueChange={(v) =>
                  setBoatForm((f) => ({ ...f, ownerId: v }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jetty</Label>
              <SearchableSelect
                options={jettyOptions}
                value={boatForm.jettyId}
                onValueChange={(v) =>
                  setBoatForm((f) => ({ ...f, jettyId: v }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <SearchableSelect
                options={STATUS_OPTS}
                value={boatForm.status}
                onValueChange={(v) =>
                  setBoatForm((f) => ({ ...f, status: v as BoatStatus }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Primary operator (optional)</Label>
              <SearchableSelect
                options={handlerOptions}
                value={boatForm.handlerId}
                onValueChange={(v) =>
                  setBoatForm((f) => ({ ...f, handlerId: v }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Permit expiry</Label>
              <Input
                type="date"
                value={boatForm.permitExpiresAt}
                onChange={(e) =>
                  setBoatForm((f) => ({
                    ...f,
                    permitExpiresAt: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Licence info</Label>
              <Input
                value={boatForm.licenceInfo}
                onChange={(e) =>
                  setBoatForm((f) => ({ ...f, licenceInfo: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoatOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionUpsertAdminBoat({
                      id: editId ?? undefined,
                      ...boatForm,
                      handlerId: boatForm.handlerId || null,
                      permitExpiresAt: boatForm.permitExpiresAt || null,
                    });
                    toast.success("Boat saved");
                    setBoatOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ownerOpen} onOpenChange={setOwnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register boat owner</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={ownerForm.name}
                onChange={(e) =>
                  setOwnerForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Login email</Label>
              <Input
                type="email"
                value={ownerForm.email}
                onChange={(e) =>
                  setOwnerForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={ownerForm.password}
                onChange={(e) =>
                  setOwnerForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={ownerForm.phone}
                onChange={(e) =>
                  setOwnerForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jetty</Label>
              <SearchableSelect
                options={jettyOptions}
                value={ownerForm.jettyId}
                onValueChange={(v) =>
                  setOwnerForm((f) => ({ ...f, jettyId: v }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>MyKad last 4</Label>
              <Input
                value={ownerForm.myKadLast4}
                onChange={(e) =>
                  setOwnerForm((f) => ({ ...f, myKadLast4: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionUpsertBoatOwner(ownerForm);
                    toast.success("Owner registered");
                    setOwnerOpen(false);
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

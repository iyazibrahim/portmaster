"use client";

import { useMemo, useState, useTransition } from "react";
import { actionUpdateHandler } from "@/lib/actions/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

export type OperatorAdminRow = {
  id: string;
  displayName: string;
  licenseNo: string | null;
  jettyId: string;
  jetty: string | null;
  ownerId: string | null;
  owner: string | null;
  email: string | null;
  userId: string | null;
};

type Option = { id: string; name: string };

export function OperatorsAdminTable({
  rows,
  jetties,
  owners,
}: {
  rows: OperatorAdminRow[];
  jetties: Option[];
  owners: Option[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [active, setActive] = useState<OperatorAdminRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [jettyId, setJettyId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [licenseNo, setLicenseNo] = useState("");

  const jettyOptions = useMemo(
    () => jetties.map((j) => ({ value: j.id, label: j.name })),
    [jetties],
  );
  const ownerOptions = useMemo(
    () => [
      { value: "", label: "— No owner —" },
      ...owners.map((o) => ({ value: o.id, label: o.name })),
    ],
    [owners],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.displayName.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.jetty ?? "").toLowerCase().includes(q) ||
        (r.owner ?? "").toLowerCase().includes(q) ||
        (r.licenseNo ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  function openEdit(r: OperatorAdminRow) {
    setActive(r);
    setDisplayName(r.displayName);
    setJettyId(r.jettyId || jetties[0]?.id || "");
    setOwnerId(r.ownerId ?? "");
    setLicenseNo(r.licenseNo ?? "");
    setEditOpen(true);
  }

  return (
    <>
      <AdminDataTable
        items={filtered}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search name, email, jetty, licence…"
        emptyMessage="No operators match."
      >
        {(pageItems) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">Name</TableHead>
                <TableHead className="px-3">Email</TableHead>
                <TableHead className="px-3">Jetty</TableHead>
                <TableHead className="px-3">Owner</TableHead>
                <TableHead className="px-3">Licence</TableHead>
                <TableHead className="w-[6rem] px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-3 py-2 font-medium">
                    {r.displayName}
                  </TableCell>
                  <TableCell className="break-all px-3 py-2 text-sm">
                    {r.email ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate px-3 py-2">
                    {r.jetty ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">{r.owner ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs">
                    {r.licenseNo ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(r)}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-visible sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit operator</DialogTitle>
            <DialogDescription>
              Updates the same handler record shown under People. Account role
              and password stay in People.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={active?.email ?? ""} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Jetty</Label>
              <SearchableSelect
                options={jettyOptions}
                value={jettyId}
                onValueChange={setJettyId}
                searchPlaceholder="Search jetty…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Boat owner</Label>
              <SearchableSelect
                options={ownerOptions}
                value={ownerId}
                onValueChange={setOwnerId}
                searchPlaceholder="Search owner…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Operator licence (optional)</Label>
              <Input
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder="e.g. PNG-H-1001"
              />
              <p className="text-xs text-muted-foreground">
                Skipper/operator ID — boat permit is under Boats.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !active || !displayName.trim() || !jettyId}
              onClick={() =>
                startTransition(async () => {
                  if (!active) return;
                  try {
                    await actionUpdateHandler({
                      handlerId: active.id,
                      displayName,
                      jettyId,
                      licenseNo,
                      boatOwnerId: ownerId || null,
                    });
                    toast.success("Operator updated");
                    setEditOpen(false);
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
    </>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  actionToggleJettyActive,
  actionUpsertJetty,
} from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { toast } from "sonner";

export type JettyRow = {
  id: string;
  name: string;
  area: string | null;
  slug: string;
  active: boolean;
  notes: string | null;
  sortOrder: number;
  locationCount: number;
  handlerCount: number;
};

export function JettyAdmin({ initial }: { initial: JettyRow[] }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    area: "",
    slug: "",
    notes: "",
    sortOrder: (initial.at(-1)?.sortOrder ?? 0) + 1,
    active: true,
  });

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

  const pager = useClientPagination(filtered, 10);

  function openCreate() {
    setForm({
      name: "",
      area: "",
      slug: "",
      notes: "",
      sortOrder: (initial.at(-1)?.sortOrder ?? 0) + 1,
      active: true,
    });
    setCreateOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 sm:max-w-sm sm:flex-1">
          <Label>Search</Label>
          <Input
            placeholder="Search jetties"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pager.resetPage();
            }}
          />
        </div>
        <Button onClick={openCreate}>Add jetty</Button>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Handlers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[7rem]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pager.pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No jetties match.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="tabular-nums">{j.sortOrder}</TableCell>
                  <TableCell>
                    <div className="font-medium">{j.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {j.slug}
                    </div>
                  </TableCell>
                  <TableCell>{j.area ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {j.locationCount}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {j.handlerCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={j.active ? "default" : "secondary"}>
                      {j.active ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await actionToggleJettyActive(j.id);
                          toast.success(
                            j.active ? "Jetty deactivated" : "Jetty activated",
                          );
                        })
                      }
                    >
                      {j.active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        canPrev={pager.canPrev}
        canNext={pager.canNext}
        onPrev={pager.goPrev}
        onNext={pager.goNext}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add jetty</DialogTitle>
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !form.name.trim()}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionUpsertJetty({
                      name: form.name,
                      area: form.area || undefined,
                      slug: form.slug || undefined,
                      notes: form.notes || undefined,
                      sortOrder: form.sortOrder,
                      active: true,
                    });
                    toast.success("Jetty saved");
                    setCreateOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Save jetty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

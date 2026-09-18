"use client";

import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    area: "",
    slug: "",
    notes: "",
    sortOrder: (initial.at(-1)?.sortOrder ?? 0) + 1,
    active: true,
  });

  const filtered = initial.filter((j) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      j.name.toLowerCase().includes(q) ||
      (j.area ?? "").toLowerCase().includes(q) ||
      j.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-border pb-6">
        <h2 className="text-base font-semibold tracking-tight">Add jetty</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input
              className="min-h-11"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jeti Nelayan…"
            />
          </div>
          <div className="space-y-1">
            <Label>Area</Label>
            <Input
              className="min-h-11"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              placeholder="George Town"
            />
          </div>
          <div className="space-y-1">
            <Label>Slug (optional)</Label>
            <Input
              className="min-h-11"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="auto from name"
            />
          </div>
          <div className="space-y-1">
            <Label>Sort order</Label>
            <Input
              type="number"
              className="min-h-11"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Notes</Label>
            <Input
              className="min-h-11"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <Button
          className="min-h-11"
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
                setForm((f) => ({
                  ...f,
                  name: "",
                  area: "",
                  slug: "",
                  notes: "",
                  sortOrder: f.sortOrder + 1,
                }));
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            })
          }
        >
          Save jetty
        </Button>
      </section>

      <Input
        className="min-h-11 max-w-xs"
        placeholder="Search jetties"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Handlers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No jetties match.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="tabular-nums">{j.sortOrder}</TableCell>
                  <TableCell>
                    <div className="font-medium">{j.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {j.slug}
                    </div>
                  </TableCell>
                  <TableCell>{j.area ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{j.locationCount}</TableCell>
                  <TableCell className="tabular-nums">{j.handlerCount}</TableCell>
                  <TableCell>
                    <Badge variant={j.active ? "default" : "secondary"}>
                      {j.active ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11"
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
    </div>
  );
}

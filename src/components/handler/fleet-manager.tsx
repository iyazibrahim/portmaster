"use client";

import { useState, useTransition } from "react";
import { actionUpsertBoat } from "@/lib/actions/booking";
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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMYR } from "@/lib/utils-app";
import { toast } from "sonner";

export type FleetBoat = {
  id: string;
  name: string;
  registration: string | null;
  capacity: number;
  active: boolean;
  pricePerPersonCents: number;
  seatLabels: string[];
};

export function FleetManager({ boats }: { boats: FleetBoat[] }) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    registration: "",
    capacity: 6,
    pricePerPersonCents: 5000,
    active: true,
  });

  function startCreate() {
    setEditingId("new");
    setForm({
      name: "",
      registration: "",
      capacity: 6,
      pricePerPersonCents: 5000,
      active: true,
    });
  }

  function startEdit(b: FleetBoat) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      registration: b.registration ?? "",
      capacity: b.capacity,
      pricePerPersonCents: b.pricePerPersonCents,
      active: b.active,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Add or edit boats in your fleet. Changing capacity rebuilds the seat
          map.
        </p>
        <Button onClick={startCreate}>Add boat</Button>
      </div>

      {editingId ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId === "new" ? "New boat" : "Edit boat"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Registration</Label>
                <Input
                  value={form.registration}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, registration: e.target.value }))
                  }
                  placeholder="PNG-BM-300"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="max-w-xs"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacity: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Price per person (sen)</Label>
                <Input
                  type="number"
                  min={0}
                  className="max-w-xs"
                  value={form.pricePerPersonCents}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricePerPersonCents: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Active in booking
            </label>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !form.name.trim()}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await actionUpsertBoat({
                      id: editingId === "new" ? undefined : editingId,
                      ...form,
                    });
                    toast.success(
                      editingId === "new" ? "Boat added" : "Boat updated",
                    );
                    setEditingId(null);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })
              }
            >
              Save
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {boats.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No boats yet. Add your first vessel to take bookings.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[5rem]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boats.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.registration ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{b.capacity}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatMYR(b.pricePerPersonCents)}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                    {b.seatLabels.join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.active ? "default" : "secondary"}>
                      {b.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(b)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { actionUpsertBoat } from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Add or edit boats in your fleet. Changing capacity rebuilds the seat
          map.
        </p>
        <Button className="min-h-11" onClick={startCreate}>
          Add boat
        </Button>
      </div>

      {editingId ? (
        <section className="space-y-3 border-y border-border py-4">
          <h2 className="text-base font-semibold tracking-tight">
            {editingId === "new" ? "New boat" : "Edit boat"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                className="min-h-11"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Registration</Label>
              <Input
                className="min-h-11"
                value={form.registration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, registration: e.target.value }))
                }
                placeholder="PNG-BM-300"
              />
            </div>
            <div className="space-y-1">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                max={20}
                className="min-h-11"
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    capacity: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Price per person (sen)</Label>
              <Input
                type="number"
                min={0}
                className="min-h-11"
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
          <label className="flex min-h-11 items-center gap-2 text-sm">
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
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
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
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {boats.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No boats yet. Add your first vessel to take bookings.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {boats.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold tracking-tight">
                    {b.name}
                  </p>
                  <Badge variant={b.active ? "default" : "secondary"}>
                    {b.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {b.registration ?? "No registration"} · capacity {b.capacity}{" "}
                  · {formatMYR(b.pricePerPersonCents)}/person
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Seats:{" "}
                  <span className="text-foreground">
                    {b.seatLabels.join(", ") || "—"}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                className="min-h-11 shrink-0"
                onClick={() => startEdit(b)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

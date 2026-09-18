"use client";

import { useState, useTransition } from "react";
import {
  actionToggleLocationStatus,
  actionUpsertLocation,
} from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sideLabel } from "@/lib/utils-app";
import { toast } from "sonner";

export type LocationRow = {
  id: string;
  jettyId: string;
  jettyName: string;
  number: number;
  side: "GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL";
  name: string;
  status: "OPEN" | "CLOSED";
  notes: string | null;
};

export type JettyOption = { id: string; name: string };

export function LocationAdmin({
  initial,
  jetties,
}: {
  initial: LocationRow[];
  jetties: JettyOption[];
}) {
  const [jettyFilter, setJettyFilter] = useState<string>(
    jetties[0]?.id ?? "ALL",
  );
  const [sideFilter, setSideFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    jettyId: jetties[0]?.id ?? "",
    number: 1,
    side: "GENERAL" as "GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL",
    name: "",
    status: "OPEN" as const,
    notes: "",
  });

  const filtered = initial.filter((t) => {
    if (jettyFilter !== "ALL" && t.jettyId !== jettyFilter) return false;
    if (sideFilter !== "ALL" && t.side !== sideFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      String(t.number).includes(q) ||
      t.jettyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-border pb-6">
        <h2 className="text-base font-semibold tracking-tight">Add location</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Jetty</Label>
            <Select
              value={form.jettyId}
              onValueChange={(v) => v && setForm((f) => ({ ...f, jettyId: v }))}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder="Select jetty" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {jetties.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Number</Label>
            <Input
              type="number"
              className="min-h-11"
              value={form.number}
              onChange={(e) =>
                setForm((f) => ({ ...f, number: Number(e.target.value) }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Side</Label>
            <Select
              value={form.side}
              onValueChange={(v) => {
                if (
                  v === "GEORGETOWN" ||
                  v === "SEBERANG_PERAI" ||
                  v === "GENERAL"
                ) {
                  setForm((f) => ({ ...f, side: v }));
                }
              }}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="GEORGETOWN">Georgetown</SelectItem>
                <SelectItem value="SEBERANG_PERAI">Seberang Perai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input
              className="min-h-11"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Berth 5"
            />
          </div>
        </div>
        <Button
          className="min-h-11"
          disabled={pending || !form.name || !form.jettyId}
          onClick={() =>
            startTransition(async () => {
              try {
                await actionUpsertLocation(form);
                toast.success("Location saved");
                setForm((f) => ({ ...f, number: f.number + 1, name: "" }));
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            })
          }
        >
          Save location
        </Button>
      </section>

      <div className="flex flex-wrap gap-3">
        <Input
          className="min-h-11 max-w-xs"
          placeholder="Search number or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          value={jettyFilter}
          onValueChange={(v) => v && setJettyFilter(v)}
        >
          <SelectTrigger className="min-h-11 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="ALL">All jetties</SelectItem>
            {jetties.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sideFilter} onValueChange={(v) => v && setSideFilter(v)}>
          <SelectTrigger className="min-h-11 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sides</SelectItem>
            <SelectItem value="GENERAL">General</SelectItem>
            <SelectItem value="GEORGETOWN">Georgetown</SelectItem>
            <SelectItem value="SEBERANG_PERAI">Seberang Perai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Jetty</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.number}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell className="max-w-[12rem] truncate">
                  {t.jettyName}
                </TableCell>
                <TableCell>{sideLabel(t.side)}</TableCell>
                <TableCell>
                  <Badge
                    variant={t.status === "OPEN" ? "default" : "secondary"}
                  >
                    {t.status}
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
                        await actionToggleLocationStatus(t.id);
                        toast.success("Status updated");
                      })
                    }
                  >
                    Toggle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 100 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing 100 of {filtered.length}. Narrow search to see more.
          </p>
        ) : null}
      </div>
    </div>
  );
}

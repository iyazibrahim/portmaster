"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { formatMYR } from "@/lib/utils-app";

export type PassAdminRow = {
  id: string;
  reference: string;
  status: string;
  validOn: string;
  feeCents: number;
  angler: string | null;
  pillar: string | null;
  jetty: string | null;
};

export function PassesAdminTable({ rows }: { rows: PassAdminRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.reference.toLowerCase().includes(q) ||
        (r.angler ?? "").toLowerCase().includes(q) ||
        (r.jetty ?? "").toLowerCase().includes(q) ||
        (r.pillar ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.validOn.includes(q),
    );
  }, [rows, query]);

  return (
    <AdminDataTable
      items={filtered}
      search={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search ref, person, jetty, pillar…"
      emptyMessage="No passes match."
    >
      {(pageItems) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">Ref</TableHead>
              <TableHead className="px-3">Person</TableHead>
              <TableHead className="px-3">Jetty</TableHead>
              <TableHead className="px-3">Pillar</TableHead>
              <TableHead className="px-3">Day</TableHead>
              <TableHead className="px-3">Fee</TableHead>
              <TableHead className="px-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="px-3 py-2 font-mono text-xs">
                  {r.reference}
                </TableCell>
                <TableCell className="px-3 py-2">{r.angler ?? "—"}</TableCell>
                <TableCell className="max-w-[10rem] truncate px-3 py-2">
                  {r.jetty ?? "—"}
                </TableCell>
                <TableCell className="max-w-[8rem] truncate px-3 py-2">
                  {r.pillar ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 py-2">
                  {r.validOn}
                </TableCell>
                <TableCell className="px-3 py-2 tabular-nums">
                  {formatMYR(r.feeCents)}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminDataTable>
  );
}

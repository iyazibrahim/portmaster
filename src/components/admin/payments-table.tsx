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

export type PaymentRow = {
  id: string;
  createdAt: string;
  angler: string;
  passRef: string;
  amountCents: number;
  method: string;
  status: string;
};

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.angler.toLowerCase().includes(q) ||
        r.passRef.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <AdminDataTable
      items={filtered}
      search={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search angler, pass ref, status…"
      emptyMessage="No payments match."
    >
      {(pageItems) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">When</TableHead>
              <TableHead className="px-3">Angler</TableHead>
              <TableHead className="px-3">Pass ref</TableHead>
              <TableHead className="px-3">Amount</TableHead>
              <TableHead className="px-3">Method</TableHead>
              <TableHead className="px-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString("en-MY")}
                </TableCell>
                <TableCell className="px-3 py-2">{r.angler}</TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs">
                  {r.passRef}
                </TableCell>
                <TableCell className="px-3 py-2 tabular-nums">
                  {formatMYR(r.amountCents)}
                </TableCell>
                <TableCell className="px-3 py-2">{r.method}</TableCell>
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

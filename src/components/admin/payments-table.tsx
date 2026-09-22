"use client";

import { Suspense, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import {
  ADMIN_CONTROL,
  AdminDataTable,
} from "@/components/admin/admin-data-table";
import {
  JettyFilter,
  type JettyFilterOption,
} from "@/components/admin/jetty-filter";
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

export function PaymentsTable({
  rows,
  jetties,
}: {
  rows: PaymentRow[];
  jetties: JettyFilterOption[];
}) {
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
      emptyMessage="No pass payments yet."
      filters={
        <Suspense fallback={null}>
          <JettyFilter
            jetties={jetties}
            className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-xs"
            selectClassName={ADMIN_CONTROL}
          />
        </Suspense>
      }
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

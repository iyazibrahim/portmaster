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
import { AdminDataTable } from "@/components/admin/admin-data-table";

export type OperatorAdminRow = {
  id: string;
  displayName: string;
  licenseNo: string | null;
  jetty: string | null;
  owner: string | null;
  email: string | null;
};

export function OperatorsAdminTable({ rows }: { rows: OperatorAdminRow[] }) {
  const [query, setQuery] = useState("");

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

  return (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminDataTable>
  );
}

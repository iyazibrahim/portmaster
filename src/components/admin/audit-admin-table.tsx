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

export type AuditRow = {
  id: string;
  when: string;
  who: string;
  whoEmail: string | null;
  action: string;
  entity: string;
  reference: string;
};

export function AuditAdminTable({ rows }: { rows: AuditRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.who.toLowerCase().includes(q) ||
        (r.whoEmail ?? "").toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.entity.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <AdminDataTable
      items={filtered}
      search={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search who, action, entity, reference…"
      emptyMessage="No audit events match."
    >
      {(pageItems) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">When</TableHead>
              <TableHead className="px-3">Who</TableHead>
              <TableHead className="px-3">Action</TableHead>
              <TableHead className="px-3">Entity</TableHead>
              <TableHead className="px-3">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap px-3 py-2 text-sm">
                  {r.when}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  {r.whoEmail ? (
                    <div>
                      <div className="font-medium">{r.who}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.whoEmail}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{r.who}</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">{r.action}</TableCell>
                <TableCell className="px-3 py-2 text-sm">{r.entity}</TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {r.reference}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminDataTable>
  );
}

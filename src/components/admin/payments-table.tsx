"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { formatMYR } from "@/lib/utils-app";

export type PaymentRow = {
  id: string;
  createdAt: string;
  angler: string;
  tripLabel: string;
  amountCents: number;
  status: string;
  mockRef: string | null;
};

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.angler.toLowerCase().includes(q) ||
        r.tripLabel.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.mockRef ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const pager = useClientPagination(filtered, 10);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label>Search</Label>
        <Input
          placeholder="Search angler, trip, status, ref…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            pager.resetPage();
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments match.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Angler</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pager.pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("en-MY")}
                    </TableCell>
                    <TableCell>{r.angler}</TableCell>
                    <TableCell className="max-w-[20rem] truncate">
                      {r.tripLabel}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMYR(r.amountCents)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.mockRef ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
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
        </>
      )}
    </div>
  );
}

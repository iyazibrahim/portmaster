"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import {
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { StatusBadge } from "@/components/status-badge";
import { formatMYR, sideLabel, tripSlotLabel } from "@/lib/utils-app";

export type TripListRow = {
  id: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  status: string;
  jettyName: string;
  boatName: string;
  locationSide: string;
  dropOffs: string;
  pax: number;
  totalCents: number;
};

export function TripsList({ rows }: { rows: TripListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.tripDate.includes(q) ||
        r.jettyName.toLowerCase().includes(q) ||
        r.boatName.toLowerCase().includes(q) ||
        r.dropOffs.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const pager = useClientPagination(filtered, 10);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label>Search</Label>
        <Input
          placeholder="Search date, jetty, boat, status…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            pager.resetPage();
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trips match.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg ring-1 ring-foreground/10 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Jetty</TableHead>
                  <TableHead>Drop-offs</TableHead>
                  <TableHead>Boat</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pager.pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/trips/${r.id}`}
                        className="block font-medium hover:underline"
                      >
                        {r.tripDate}
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {tripSlotLabel(r.startTime, r.endTime)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{r.jettyName}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                      {r.dropOffs.includes("·")
                        ? r.dropOffs
                        : `${r.dropOffs} · ${sideLabel(r.locationSide)}`}
                    </TableCell>
                    <TableCell>{r.boatName}</TableCell>
                    <TableCell className="tabular-nums">{r.pax}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMYR(r.totalCents)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border rounded-lg ring-1 ring-foreground/10 md:hidden">
            {pager.pageItems.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/trips/${r.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {r.tripDate} · {tripSlotLabel(r.startTime, r.endTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.jettyName} · {r.boatName} · {r.pax} pax ·{" "}
                      {formatMYR(r.totalCents)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>

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

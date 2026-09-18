"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { CompleteTripButton } from "@/components/handler/complete-trip-button";
import { tripSlotLabel } from "@/lib/utils-app";

export type ScheduleRow = {
  id: string;
  startTime: string;
  endTime: string;
  fisherName: string;
  boatName: string;
  locationNumber: number;
  partySize: number;
  status: string;
  seats: string;
  isPrimary: boolean;
};

export function HandlerScheduleTables({
  live,
  today,
}: {
  live: ScheduleRow[];
  today: ScheduleRow[];
}) {
  const [query, setQuery] = useState("");

  const filteredToday = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return today;
    return today.filter(
      (r) =>
        r.fisherName.toLowerCase().includes(q) ||
        r.boatName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        String(r.locationNumber).includes(q),
    );
  }, [today, query]);

  const pager = useClientPagination(filteredToday, 10);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Live checked-in ({live.length})
        </h2>
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No anglers checked in yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Angler</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead className="w-[7rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fisherName}</TableCell>
                    <TableCell>#{r.locationNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.seats || "—"}
                    </TableCell>
                    <TableCell>
                      <CompleteTripButton bookingId={r.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Today&apos;s bookings
          </h2>
          <div className="flex flex-col gap-1.5 sm:max-w-xs sm:flex-1">
            <Label>Search</Label>
            <Input
              placeholder="Search angler, boat, status…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                pager.resetPage();
              }}
            />
          </div>
        </div>

        {filteredToday.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings match.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Angler</TableHead>
                    <TableHead>Boat / location</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pager.pageItems.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {tripSlotLabel(r.startTime, r.endTime)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.fisherName}
                      </TableCell>
                      <TableCell>
                        {r.boatName} · #{r.locationNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.seats || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.partySize > 1 ? "default" : "secondary"}
                        >
                          {r.partySize > 1
                            ? `Group · ${r.partySize}p`
                            : "Individual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {r.status.replaceAll("_", " ")}
                        </Badge>
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
      </section>
    </div>
  );
}

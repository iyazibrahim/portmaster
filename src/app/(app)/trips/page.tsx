import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { bookings, boats, jetties, locations } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatMYR, sideLabel, tripSlotLabel } from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING_PAYMENT: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export default async function TripsPage() {
  const session = await requireSession();

  const rows = await db
    .select({
      id: bookings.id,
      tripGroupId: bookings.tripGroupId,
      isPrimary: bookings.isPrimary,
      tripDate: bookings.tripDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      totalCents: bookings.totalCents,
      partySize: bookings.partySize,
      boatName: boats.name,
      jettyName: jetties.name,
      locationName: locations.name,
      locationSide: locations.side,
      locationNumber: locations.number,
    })
    .from(bookings)
    .innerJoin(boats, eq(bookings.boatId, boats.id))
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .innerJoin(jetties, eq(bookings.jettyId, jetties.id))
    .where(eq(bookings.userId, session.user.id))
    .orderBy(desc(bookings.createdAt));

  const groupTotals = new Map<string, number>();
  const groupPax = new Map<string, number>();
  const locationLabels = new Map<string, string[]>();
  for (const r of rows) {
    groupTotals.set(
      r.tripGroupId,
      (groupTotals.get(r.tripGroupId) ?? 0) + r.totalCents,
    );
    groupPax.set(
      r.tripGroupId,
      (groupPax.get(r.tripGroupId) ?? 0) + r.partySize,
    );
    const label = `#${r.locationNumber} ${r.locationName}`;
    const list = locationLabels.get(r.tripGroupId) ?? [];
    list.push(label);
    locationLabels.set(r.tripGroupId, list);
  }

  const primaries = rows.filter((r) => r.isPrimary);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My trips</h1>
          <p className="text-sm text-muted-foreground">
            Bookings, receipts, and boarding QR.
          </p>
        </div>
        <Link href="/book" className={cn(buttonVariants(), "min-h-11")}>
          Book
        </Link>
      </div>

      {primaries.length === 0 ? (
        <Alert>
          <AlertTitle>No trips yet</AlertTitle>
          <AlertDescription>
            Book a location trip to see it here with your seat map and QR pass.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-border md:block">
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
                {primaries.map((r) => {
                  const locs = locationLabels.get(r.tripGroupId) ?? [];
                  const pax = groupPax.get(r.tripGroupId) ?? r.partySize;
                  const total = groupTotals.get(r.tripGroupId) ?? r.totalCents;
                  return (
                    <TableRow key={r.id} className="cursor-pointer">
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
                        {locs.length > 1
                          ? locs.join(" · ")
                          : `${locs[0] ?? ""} · ${sideLabel(r.locationSide)}`}
                      </TableCell>
                      <TableCell>{r.boatName}</TableCell>
                      <TableCell className="tabular-nums">{pax}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatMYR(total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[r.status] ?? "secondary"}>
                          {r.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border border-y border-border md:hidden">
            {primaries.map((r) => {
              const locs = locationLabels.get(r.tripGroupId) ?? [];
              const pax = groupPax.get(r.tripGroupId) ?? r.partySize;
              const total = groupTotals.get(r.tripGroupId) ?? r.totalCents;
              return (
                <li key={r.id}>
                  <Link
                    href={`/trips/${r.id}`}
                    className="flex min-h-16 items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {r.tripDate} · {tripSlotLabel(r.startTime, r.endTime)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {r.jettyName} · {r.boatName} · {pax} pax ·{" "}
                        {formatMYR(total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {locs.length > 1
                          ? `Drop-offs: ${locs.join(" · ")}`
                          : `${locs[0] ?? ""} · ${sideLabel(r.locationSide)}`}
                      </p>
                    </div>
                    <Badge variant={statusVariant[r.status] ?? "secondary"}>
                      {r.status.replaceAll("_", " ")}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

import { Suspense } from "react";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import {
  bookings,
  boats,
  handlers,
  jetties,
  locations,
  payments,
  scanEvents,
  users,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatMYR, sideLabel } from "@/lib/utils-app";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JettyFilter } from "@/components/admin/jetty-filter";

export default async function AdminOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ jetty?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { jetty: jettyParam } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");

  const jettyOptions = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  const jettyId =
    jettyParam && jettyParam !== "all"
      ? jettyOptions.find((j) => j.id === jettyParam)?.id
      : undefined;

  const live = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      partySize: bookings.partySize,
      tripDate: bookings.tripDate,
      startTime: bookings.startTime,
      fisher: users.name,
      boat: boats.name,
      jettyName: jetties.name,
      locationNumber: locations.number,
      locationSide: locations.side,
      locationName: locations.name,
      handler: handlers.displayName,
      checkInAt: sql<Date | null>`(
        select max(${scanEvents.scannedAt})
        from ${scanEvents}
        where ${scanEvents.bookingId} = ${bookings.id}
          and ${scanEvents.type} = 'CHECK_IN'
      )`,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(boats, eq(bookings.boatId, boats.id))
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .innerJoin(jetties, eq(bookings.jettyId, jetties.id))
    .innerJoin(handlers, eq(bookings.handlerId, handlers.id))
    .where(
      jettyId
        ? sql`${bookings.jettyId} = ${jettyId} and ${bookings.status} in ('CONFIRMED','CHECKED_IN','PENDING_PAYMENT')`
        : inArray(bookings.status, [
            "CONFIRMED",
            "CHECKED_IN",
            "PENDING_PAYMENT",
          ]),
    )
    .orderBy(desc(bookings.updatedAt))
    .limit(50);

  const checkedIn = live.filter((r) => r.status === "CHECKED_IN");

  const [occupancy] = await db
    .select({
      people: sql<number>`coalesce(sum(${bookings.partySize}), 0)`,
    })
    .from(bookings)
    .where(
      jettyId
        ? sql`${bookings.tripDate} = ${today} and ${bookings.status} = 'CHECKED_IN' and ${bookings.jettyId} = ${jettyId}`
        : sql`${bookings.tripDate} = ${today} and ${bookings.status} = 'CHECKED_IN'`,
    );

  const [paidToday] = await db
    .select({
      cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(
      jettyId
        ? sql`${bookings.tripDate} = ${today} and ${payments.status} = 'PAID' and ${bookings.jettyId} = ${jettyId}`
        : sql`${bookings.tripDate} = ${today} and ${payments.status} = 'PAID'`,
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live ops</h1>
        <p className="text-sm text-muted-foreground">
          Current location for checked-in anglers comes from assigned location
          plus check-in time (no live GPS).
        </p>
      </div>

      <Suspense fallback={null}>
        <JettyFilter jetties={jettyOptions} />
      </Suspense>

      <div className="grid gap-6 rounded-lg py-4 ring-1 ring-foreground/10 sm:grid-cols-2 sm:gap-8 sm:px-4">
        <div>
          <p className="text-xs text-muted-foreground">Checked-in today</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {Number(occupancy?.people ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid volume today</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {formatMYR(Number(paidToday?.cents ?? 0))}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          On the water now ({checkedIn.length})
        </h2>
        {checkedIn.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No anglers checked in.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Angler</TableHead>
                  <TableHead>Jetty / location</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Boat / handler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkedIn.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.fisher} · {r.partySize}p
                    </TableCell>
                    <TableCell>
                      {r.jettyName} · #{r.locationNumber} {r.locationName} ·{" "}
                      {sideLabel(r.locationSide)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.checkInAt
                        ? new Date(r.checkInAt).toLocaleTimeString("en-MY", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {r.boat} · {r.handler}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Active bookings
        </h2>
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active bookings.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Angler</TableHead>
                  <TableHead>Jetty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Boat</TableHead>
                  <TableHead>Handler</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {r.tripDate} {r.startTime}
                    </TableCell>
                    <TableCell>
                      {r.fisher} · {r.partySize}p
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {r.jettyName}
                    </TableCell>
                    <TableCell>
                      #{r.locationNumber} {sideLabel(r.locationSide)}
                    </TableCell>
                    <TableCell>{r.boat}</TableCell>
                    <TableCell>{r.handler}</TableCell>
                    <TableCell>
                      <Badge>{r.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

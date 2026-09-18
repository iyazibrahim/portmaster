import { and, desc, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import {
  bookingSeats,
  bookings,
  boatSeats,
  boats,
  handlers,
  jetties,
  locations,
  users,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CompleteTripButton } from "@/components/handler/complete-trip-button";
import { tripSlotLabel } from "@/lib/utils-app";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HandlerSchedulePage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const [handler] = await db
    .select({
      id: handlers.id,
      displayName: handlers.displayName,
      jettyId: handlers.jettyId,
      jettyName: jetties.name,
    })
    .from(handlers)
    .innerJoin(jetties, eq(handlers.jettyId, jetties.id))
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No handler profile</AlertTitle>
        <AlertDescription>
          This account is not linked to a handler record.
        </AlertDescription>
      </Alert>
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      booking: bookings,
      boatName: boats.name,
      locationName: locations.name,
      locationNumber: locations.number,
      fisherName: users.name,
    })
    .from(bookings)
    .innerJoin(boats, eq(bookings.boatId, boats.id))
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(
      and(
        eq(bookings.handlerId, handler.id),
        eq(bookings.jettyId, handler.jettyId),
        eq(bookings.tripDate, today),
        inArray(bookings.status, [
          "CONFIRMED",
          "CHECKED_IN",
          "COMPLETED",
          "PENDING_PAYMENT",
        ]),
      ),
    )
    .orderBy(bookings.startTime, desc(bookings.createdAt));

  const bookingIds = rows.map((r) => r.booking.id);
  const seatRows =
    bookingIds.length === 0
      ? []
      : await db
          .select({
            bookingId: bookingSeats.bookingId,
            label: boatSeats.label,
          })
          .from(bookingSeats)
          .innerJoin(boatSeats, eq(bookingSeats.boatSeatId, boatSeats.id))
          .where(inArray(bookingSeats.bookingId, bookingIds));

  const seatsByBooking = new Map<string, string[]>();
  for (const s of seatRows) {
    const list = seatsByBooking.get(s.bookingId) ?? [];
    list.push(s.label);
    seatsByBooking.set(s.bookingId, list);
  }

  const checkedIn = rows.filter((r) => r.booking.status === "CHECKED_IN");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">
            {handler.displayName} · {handler.jettyName} · {today}
          </p>
        </div>
        <Link
          href="/handler/scan"
          className={cn(buttonVariants(), "min-h-11")}
        >
          Open scanner
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-base font-semibold tracking-tight">
          Live checked-in ({checkedIn.length})
        </h2>
        {checkedIn.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No anglers checked in yet.
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {checkedIn.map((r) => (
              <li
                key={r.booking.id}
                className="flex min-h-14 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{r.fisherName}</p>
                  <p className="text-sm text-muted-foreground">
                    Seats{" "}
                    {(seatsByBooking.get(r.booking.id) ?? []).join(", ") || "—"}{" "}
                    · Location #{r.locationNumber}
                  </p>
                </div>
                <CompleteTripButton bookingId={r.booking.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold tracking-tight">
          Today&apos;s bookings
        </h2>
        {rows.length === 0 ? (
          <Alert>
            <AlertTitle>Empty schedule</AlertTitle>
            <AlertDescription>
              No bookings assigned to you for today.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {rows.map((r) => {
              const isGroup = r.booking.partySize > 1;
              return (
                <li
                  key={r.booking.id}
                  className="flex min-h-14 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {tripSlotLabel(r.booking.startTime, r.booking.endTime)} ·{" "}
                      {r.fisherName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.boatName} · Location #{r.locationNumber} · seats{" "}
                      {(seatsByBooking.get(r.booking.id) ?? []).join(", ") ||
                        "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isGroup ? "default" : "secondary"}>
                      {isGroup
                        ? `Group · ${r.booking.partySize}p`
                        : "Individual"}
                    </Badge>
                    <Badge variant="outline">
                      {r.booking.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

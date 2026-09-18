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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HandlerScheduleTables } from "@/components/handler/handler-schedule-tables";
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

  const mapped = rows.map((r) => ({
    id: r.booking.id,
    startTime: r.booking.startTime,
    endTime: r.booking.endTime,
    fisherName: r.fisherName,
    boatName: r.boatName,
    locationNumber: r.locationNumber,
    partySize: r.booking.partySize,
    status: r.booking.status,
    seats: (seatsByBooking.get(r.booking.id) ?? []).join(", "),
    isPrimary: r.booking.isPrimary,
  }));

  const live = mapped.filter(
    (r) => r.status === "CHECKED_IN" && r.isPrimary,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">
            {handler.displayName} · {handler.jettyName} · {today}
          </p>
        </div>
        <Link href="/handler/scan" className={cn(buttonVariants())}>
          Open scanner
        </Link>
      </div>

      {mapped.length === 0 ? (
        <Alert>
          <AlertTitle>Empty schedule</AlertTitle>
          <AlertDescription>
            No bookings assigned to you for today.
          </AlertDescription>
        </Alert>
      ) : (
        <HandlerScheduleTables live={live} today={mapped} />
      )}
    </div>
  );
}

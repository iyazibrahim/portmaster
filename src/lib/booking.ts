import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bookingAccessTokens,
  bookingSeats,
  bookings,
  boatSeats,
  boats,
  handlers,
  jetties,
  locations,
  payments,
  scanEvents,
} from "@/db/schema";
import { id, opaqueToken } from "@/lib/utils-app";

const ACTIVE_HOLD_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

const OCCUPANCY_STATUSES = ["CHECKED_IN"] as const;

export async function getTakenSeatIds(params: {
  boatId: string;
  tripDate: string;
  startTime: string;
  excludeBookingId?: string;
}) {
  const rows = await db
    .select({ boatSeatId: bookingSeats.boatSeatId })
    .from(bookingSeats)
    .innerJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.boatId, params.boatId),
        eq(bookings.tripDate, params.tripDate),
        eq(bookings.startTime, params.startTime),
        inArray(bookings.status, [...ACTIVE_HOLD_STATUSES]),
        params.excludeBookingId
          ? ne(bookings.id, params.excludeBookingId)
          : sql`true`,
      ),
    );
  return new Set(rows.map((r) => r.boatSeatId));
}

export async function assertSeatsAvailable(params: {
  boatId: string;
  tripDate: string;
  startTime: string;
  seatIds: string[];
  partySize: number;
}) {
  if (params.seatIds.length !== params.partySize) {
    throw new Error(`Select exactly ${params.partySize} seats.`);
  }

  const unique = new Set(params.seatIds);
  if (unique.size !== params.seatIds.length) {
    throw new Error("Duplicate seats selected.");
  }

  const seats = await db
    .select()
    .from(boatSeats)
    .where(
      and(
        eq(boatSeats.boatId, params.boatId),
        inArray(boatSeats.id, params.seatIds),
      ),
    );

  if (seats.length !== params.seatIds.length) {
    throw new Error("One or more seats are invalid for this boat.");
  }
  if (seats.some((s) => s.blocked)) {
    throw new Error("A selected seat is blocked.");
  }

  const [boat] = await db
    .select()
    .from(boats)
    .where(eq(boats.id, params.boatId))
    .limit(1);
  if (!boat || !boat.active) {
    throw new Error("Boat is not available.");
  }
  if (params.partySize > boat.capacity) {
    throw new Error("Party size exceeds boat capacity.");
  }

  const taken = await getTakenSeatIds(params);
  for (const seatId of params.seatIds) {
    if (taken.has(seatId)) {
      throw new Error("One or more seats were just taken. Pick again.");
    }
  }

  const heldCount = taken.size + params.seatIds.length;
  if (heldCount > boat.capacity) {
    throw new Error("Boat is over capacity for this slot.");
  }

  return { boat, seats };
}

export async function createBookingWithSeats(input: {
  userId: string;
  locationId: string;
  boatId: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  seatIds: string[];
}) {
  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, input.locationId))
    .limit(1);
  if (!location || location.status !== "OPEN") {
    throw new Error("Selected location is closed or missing.");
  }

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, location.jettyId))
    .limit(1);
  if (!jetty || !jetty.active) {
    throw new Error("Selected jetty is inactive or missing.");
  }

  const { boat } = await assertSeatsAvailable({
    boatId: input.boatId,
    tripDate: input.tripDate,
    startTime: input.startTime,
    seatIds: input.seatIds,
    partySize: input.partySize,
  });

  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.id, boat.handlerId))
    .limit(1);
  if (!handler || handler.jettyId !== location.jettyId) {
    throw new Error("Boat is not available at this jetty.");
  }

  const bookingId = id("bkg");
  const totalCents = boat.pricePerPersonCents * input.partySize;

  await db.insert(bookings).values({
    id: bookingId,
    userId: input.userId,
    handlerId: boat.handlerId,
    jettyId: location.jettyId,
    locationId: input.locationId,
    boatId: input.boatId,
    tripDate: input.tripDate,
    startTime: input.startTime,
    endTime: input.endTime,
    partySize: input.partySize,
    status: "PENDING_PAYMENT",
    totalCents,
  });

  await db.insert(bookingSeats).values(
    input.seatIds.map((boatSeatId) => ({
      id: id("bks"),
      bookingId,
      boatSeatId,
    })),
  );

  await db.insert(payments).values({
    id: id("pay"),
    bookingId,
    amountCents: totalCents,
    status: "PENDING",
  });

  return { bookingId, totalCents };
}

export async function mockPayBooking(bookingId: string, userId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
    .limit(1);

  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "PENDING_PAYMENT") {
    throw new Error("Booking is not awaiting payment.");
  }

  const seatRows = await db
    .select({ boatSeatId: bookingSeats.boatSeatId })
    .from(bookingSeats)
    .where(eq(bookingSeats.bookingId, bookingId));

  const taken = await getTakenSeatIds({
    boatId: booking.boatId,
    tripDate: booking.tripDate,
    startTime: booking.startTime,
    excludeBookingId: bookingId,
  });
  for (const s of seatRows) {
    if (taken.has(s.boatSeatId)) {
      throw new Error("Seats no longer available. Cancel and rebook.");
    }
  }

  const mockRef = `MOCK-${opaqueToken().slice(0, 10).toUpperCase()}`;
  const now = new Date();

  await db
    .update(payments)
    .set({ status: "PAID", mockRef, paidAt: now })
    .where(eq(payments.bookingId, bookingId));

  await db
    .update(bookings)
    .set({ status: "CONFIRMED", updatedAt: now })
    .where(eq(bookings.id, bookingId));

  const token = opaqueToken();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  await db.insert(bookingAccessTokens).values({
    id: id("tok"),
    bookingId,
    token,
    purpose: "BOARDING",
    expiresAt,
  });

  return { token, mockRef, expiresAt };
}

export async function getLocationOccupancy(locationId: string, tripDate: string) {
  const rows = await db
    .select({
      partySize: bookings.partySize,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.locationId, locationId),
        eq(bookings.tripDate, tripDate),
        inArray(bookings.status, [...OCCUPANCY_STATUSES]),
      ),
    );
  return rows.reduce((sum, r) => sum + r.partySize, 0);
}

export async function scanBoardingToken(params: {
  token: string;
  handlerId: string;
  lat?: string;
  lng?: string;
}) {
  const [row] = await db
    .select({
      token: bookingAccessTokens,
      booking: bookings,
    })
    .from(bookingAccessTokens)
    .innerJoin(bookings, eq(bookingAccessTokens.bookingId, bookings.id))
    .where(eq(bookingAccessTokens.token, params.token.trim()))
    .limit(1);

  if (!row) throw new Error("Invalid QR token.");
  if (row.token.revokedAt) throw new Error("Token revoked.");
  if (row.token.expiresAt.getTime() < Date.now()) {
    throw new Error("Token expired.");
  }
  if (row.booking.handlerId !== params.handlerId) {
    throw new Error("This booking is assigned to another handler.");
  }

  const now = new Date();

  if (row.booking.status === "CONFIRMED") {
    if (row.token.usedAt) throw new Error("Boarding token already used.");

    await db
      .update(bookingAccessTokens)
      .set({ usedAt: now })
      .where(eq(bookingAccessTokens.id, row.token.id));

    await db
      .update(bookings)
      .set({ status: "CHECKED_IN", updatedAt: now })
      .where(eq(bookings.id, row.booking.id));

    await db.insert(scanEvents).values({
      id: id("scn"),
      bookingId: row.booking.id,
      handlerId: params.handlerId,
      type: "CHECK_IN",
      scannedAt: now,
      lat: params.lat,
      lng: params.lng,
    });

    const [handler] = await db
      .select()
      .from(handlers)
      .where(eq(handlers.id, params.handlerId))
      .limit(1);
    if (handler) {
      await db
        .update(handlers)
        .set({
          mockEarningsCents:
            handler.mockEarningsCents + row.booking.totalCents,
        })
        .where(eq(handlers.id, params.handlerId));
    }

    return { action: "CHECK_IN" as const, booking: row.booking };
  }

  if (row.booking.status === "CHECKED_IN") {
    await db
      .update(bookings)
      .set({ status: "COMPLETED", updatedAt: now })
      .where(eq(bookings.id, row.booking.id));

    await db.insert(scanEvents).values({
      id: id("scn"),
      bookingId: row.booking.id,
      handlerId: params.handlerId,
      type: "CHECK_OUT",
      scannedAt: now,
      lat: params.lat,
      lng: params.lng,
    });

    return { action: "CHECK_OUT" as const, booking: row.booking };
  }

  throw new Error(`Cannot scan booking in status ${row.booking.status}.`);
}

export async function completeTrip(bookingId: string, handlerId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.handlerId, handlerId)),
    )
    .limit(1);

  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "CHECKED_IN") {
    throw new Error("Only checked-in trips can be completed.");
  }

  const now = new Date();
  await db
    .update(bookings)
    .set({ status: "COMPLETED", updatedAt: now })
    .where(eq(bookings.id, bookingId));

  await db.insert(scanEvents).values({
    id: id("scn"),
    bookingId,
    handlerId,
    type: "CHECK_OUT",
    scannedAt: now,
    note: "Completed via handler dashboard",
  });
}

export async function markOverdueNoShows(tripDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (tripDate >= today) return 0;

  await db
    .update(bookings)
    .set({ status: "NO_SHOW", updatedAt: new Date() })
    .where(
      and(
        eq(bookings.tripDate, tripDate),
        eq(bookings.status, "CONFIRMED"),
      ),
    );
  return 1;
}

export { ACTIVE_HOLD_STATUSES, OCCUPANCY_STATUSES };

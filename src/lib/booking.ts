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
import { id, opaqueToken, LOCATION_MAX_PAX } from "@/lib/utils-app";

const ACTIVE_HOLD_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

/** Counts toward tiang capacity (holds + on-water). */
const OCCUPANCY_STATUSES = ACTIVE_HOLD_STATUSES;

export async function getTakenSeatIds(params: {
  boatId: string;
  tripDate: string;
  startTime: string;
  excludeBookingId?: string;
  excludeTripGroupId?: string;
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
        params.excludeTripGroupId
          ? ne(bookings.tripGroupId, params.excludeTripGroupId)
          : params.excludeBookingId
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
  excludeTripGroupId?: string;
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

  const taken = await getTakenSeatIds({
    boatId: params.boatId,
    tripDate: params.tripDate,
    startTime: params.startTime,
    excludeTripGroupId: params.excludeTripGroupId,
  });
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

export async function getLocationOccupancy(
  locationId: string,
  tripDate: string,
  excludeTripGroupId?: string,
) {
  const rows = await db
    .select({
      partySize: bookings.partySize,
      tripGroupId: bookings.tripGroupId,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.locationId, locationId),
        eq(bookings.tripDate, tripDate),
        inArray(bookings.status, [...OCCUPANCY_STATUSES]),
      ),
    );
  return rows
    .filter((r) =>
      excludeTripGroupId ? r.tripGroupId !== excludeTripGroupId : true,
    )
    .reduce((sum, r) => sum + r.partySize, 0);
}

/** Map key `${locationId}|${tripDate}` → occupied pax. */
export async function getLocationOccupancyMap(params: {
  locationIds: string[];
  tripDates: string[];
}): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (params.locationIds.length === 0 || params.tripDates.length === 0) {
    return result;
  }

  const rows = await db
    .select({
      locationId: bookings.locationId,
      tripDate: bookings.tripDate,
      partySize: bookings.partySize,
    })
    .from(bookings)
    .where(
      and(
        inArray(bookings.locationId, params.locationIds),
        inArray(bookings.tripDate, params.tripDates),
        inArray(bookings.status, [...OCCUPANCY_STATUSES]),
      ),
    );

  for (const r of rows) {
    const key = `${r.locationId}|${r.tripDate}`;
    result[key] = (result[key] ?? 0) + r.partySize;
  }
  return result;
}

export function remainingSlots(occupied: number) {
  return Math.max(0, LOCATION_MAX_PAX - occupied);
}

async function assertLocationCapacity(params: {
  locationId: string;
  tripDate: string;
  pax: number;
  excludeTripGroupId?: string;
}) {
  if (params.pax < 1) {
    throw new Error("Each location allocation needs at least 1 person.");
  }
  if (params.pax > LOCATION_MAX_PAX) {
    throw new Error(
      `Each tiang holds max ${LOCATION_MAX_PAX} people. Split across locations.`,
    );
  }

  const occupied = await getLocationOccupancy(
    params.locationId,
    params.tripDate,
    params.excludeTripGroupId,
  );
  const left = remainingSlots(occupied);
  if (params.pax > left) {
    throw new Error(
      `Location has only ${left} slot${left === 1 ? "" : "s"} left (max ${LOCATION_MAX_PAX} per tiang).`,
    );
  }
}

export type LocationAllocation = { locationId: string; pax: number };

/**
 * One boat trip with one or more tiang allocations (each ≤ LOCATION_MAX_PAX).
 * Primary booking holds seats + payment + boarding QR; sibling legs share tripGroupId.
 */
export async function createTripGroupWithAllocations(input: {
  userId: string;
  boatId: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  seatIds: string[];
  allocations: LocationAllocation[];
}) {
  if (!input.allocations.length) {
    throw new Error("Allocate people to at least one location.");
  }

  const allocSum = input.allocations.reduce((s, a) => s + a.pax, 0);
  if (allocSum !== input.partySize) {
    throw new Error(
      `Location allocations (${allocSum}) must equal party size (${input.partySize}).`,
    );
  }

  const locationIds = input.allocations.map((a) => a.locationId);
  if (new Set(locationIds).size !== locationIds.length) {
    throw new Error("Each location can only appear once in allocations.");
  }

  const locationRows = await db
    .select()
    .from(locations)
    .where(inArray(locations.id, locationIds));
  if (locationRows.length !== locationIds.length) {
    throw new Error("One or more locations are missing.");
  }
  if (locationRows.some((l) => l.status !== "AVAILABLE")) {
    throw new Error("One or more selected locations are closed.");
  }

  const jettyId = locationRows[0]!.jettyId;
  if (locationRows.some((l) => l.jettyId !== jettyId)) {
    throw new Error("All locations must be at the same jetty.");
  }

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, jettyId))
    .limit(1);
  if (!jetty || !jetty.active) {
    throw new Error("Selected jetty is inactive or missing.");
  }

  for (const a of input.allocations) {
    await assertLocationCapacity({
      locationId: a.locationId,
      tripDate: input.tripDate,
      pax: a.pax,
    });
  }

  const { boat } = await assertSeatsAvailable({
    boatId: input.boatId,
    tripDate: input.tripDate,
    startTime: input.startTime,
    seatIds: input.seatIds,
    partySize: input.partySize,
  });

  const assignedHandlerId = boat.handlerId;
  if (!assignedHandlerId) {
    throw new Error("Boat has no assigned operator.");
  }
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.id, assignedHandlerId))
    .limit(1);
  if (!handler || handler.jettyId !== jettyId) {
    throw new Error("Boat is not available at this jetty.");
  }

  const tripGroupId = id("grp");
  const primaryBookingId = id("bkg");
  let totalCents = 0;

  for (let i = 0; i < input.allocations.length; i++) {
    const alloc = input.allocations[i]!;
    const isPrimary = i === 0;
    const bookingId = isPrimary ? primaryBookingId : id("bkg");
    const legCents = boat.pricePerPersonCents * alloc.pax;
    totalCents += legCents;

    await db.insert(bookings).values({
      id: bookingId,
      tripGroupId,
      userId: input.userId,
      handlerId: assignedHandlerId,
      jettyId,
      locationId: alloc.locationId,
      boatId: input.boatId,
      tripDate: input.tripDate,
      startTime: input.startTime,
      endTime: input.endTime,
      partySize: alloc.pax,
      status: "PENDING_PAYMENT",
      totalCents: legCents,
      isPrimary,
    });

    if (isPrimary) {
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
        amountCents: 0, // filled after loop with full group total
        status: "PENDING",
      });
    }
  }

  await db
    .update(payments)
    .set({ amountCents: totalCents })
    .where(eq(payments.bookingId, primaryBookingId));

  return { bookingId: primaryBookingId, tripGroupId, totalCents };
}

/** Single-location booking (party ≤ LOCATION_MAX_PAX). */
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
  return createTripGroupWithAllocations({
    userId: input.userId,
    boatId: input.boatId,
    tripDate: input.tripDate,
    startTime: input.startTime,
    endTime: input.endTime,
    partySize: input.partySize,
    seatIds: input.seatIds,
    allocations: [{ locationId: input.locationId, pax: input.partySize }],
  });
}

async function bookingsInGroup(tripGroupId: string) {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.tripGroupId, tripGroupId));
}

export async function mockPayBooking(bookingId: string, userId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
    .limit(1);

  if (!booking) throw new Error("Booking not found.");
  if (!booking.isPrimary) {
    throw new Error("Pay the primary trip booking for this group.");
  }
  if (booking.status !== "PENDING_PAYMENT") {
    throw new Error("Booking is not awaiting payment.");
  }

  const group = await bookingsInGroup(booking.tripGroupId);
  for (const leg of group) {
    await assertLocationCapacity({
      locationId: leg.locationId,
      tripDate: leg.tripDate,
      pax: leg.partySize,
      excludeTripGroupId: booking.tripGroupId,
    });
  }

  const seatRows = await db
    .select({ boatSeatId: bookingSeats.boatSeatId })
    .from(bookingSeats)
    .where(eq(bookingSeats.bookingId, bookingId));

  const taken = await getTakenSeatIds({
    boatId: booking.boatId,
    tripDate: booking.tripDate,
    startTime: booking.startTime,
    excludeTripGroupId: booking.tripGroupId,
  });
  for (const s of seatRows) {
    if (taken.has(s.boatSeatId)) {
      throw new Error("Seats no longer available. Cancel and rebook.");
    }
  }

  const mockRef = `MOCK-${opaqueToken().slice(0, 10).toUpperCase()}`;
  const now = new Date();
  const groupTotal = group.reduce((s, b) => s + b.totalCents, 0);

  await db
    .update(payments)
    .set({
      status: "PAID",
      mockRef,
      paidAt: now,
      amountCents: groupTotal,
    })
    .where(eq(payments.bookingId, bookingId));

  await db
    .update(bookings)
    .set({ status: "CONFIRMED", updatedAt: now })
    .where(eq(bookings.tripGroupId, booking.tripGroupId));

  const token = opaqueToken();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  await db.insert(bookingAccessTokens).values({
    id: id("tok"),
    bookingId,
    token,
    purpose: "BOARDING",
    expiresAt,
  });

  return { token, mockRef, expiresAt, tripGroupId: booking.tripGroupId };
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
  const group = await bookingsInGroup(row.booking.tripGroupId);
  const groupTotal = group.reduce((s, b) => s + b.totalCents, 0);

  if (row.booking.status === "CONFIRMED") {
    if (row.token.usedAt) throw new Error("Boarding token already used.");

    await db
      .update(bookingAccessTokens)
      .set({ usedAt: now })
      .where(eq(bookingAccessTokens.id, row.token.id));

    await db
      .update(bookings)
      .set({ status: "CHECKED_IN", updatedAt: now })
      .where(eq(bookings.tripGroupId, row.booking.tripGroupId));

    await db.insert(scanEvents).values({
      id: id("scn"),
      bookingId: row.booking.id,
      handlerId: params.handlerId,
      type: "CHECK_IN",
      scannedAt: now,
      lat: params.lat,
      lng: params.lng,
      note:
        group.length > 1
          ? `Trip group ${row.booking.tripGroupId} (${group.length} locations)`
          : null,
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
          mockEarningsCents: handler.mockEarningsCents + groupTotal,
        })
        .where(eq(handlers.id, params.handlerId));
    }

    return { action: "CHECK_IN" as const, booking: row.booking };
  }

  if (row.booking.status === "CHECKED_IN") {
    await db
      .update(bookings)
      .set({ status: "COMPLETED", updatedAt: now })
      .where(eq(bookings.tripGroupId, row.booking.tripGroupId));

    await db.insert(scanEvents).values({
      id: id("scn"),
      bookingId: row.booking.id,
      handlerId: params.handlerId,
      type: "CHECK_OUT",
      scannedAt: now,
      lat: params.lat,
      lng: params.lng,
      note:
        group.length > 1
          ? `Trip group ${row.booking.tripGroupId} checkout`
          : null,
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
    .where(eq(bookings.tripGroupId, booking.tripGroupId));

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

export { ACTIVE_HOLD_STATUSES, OCCUPANCY_STATUSES, LOCATION_MAX_PAX };

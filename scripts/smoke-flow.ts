import "dotenv/config";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../src/db/index";
import {
  boatSeats,
  boats,
  handlers,
  jetties,
  locations,
  users,
} from "../src/db/schema";
import {
  createBookingWithSeats,
  createTripGroupWithAllocations,
  getLocationOccupancy,
  getTakenSeatIds,
  mockPayBooking,
  scanBoardingToken,
} from "../src/lib/booking";
import { LOCATION_MAX_PAX } from "../src/lib/utils-app";

async function bookAtJetty(params: {
  fisherId: string;
  jettySlug: string;
  boatName: string;
  startTime: string;
  endTime: string;
  partySize: number;
}) {
  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.slug, params.jettySlug))
    .limit(1);
  if (!jetty) throw new Error(`Jetty missing: ${params.jettySlug}`);

  const [boat] = await db
    .select({
      id: boats.id,
      handlerId: boats.handlerId,
      capacity: boats.capacity,
    })
    .from(boats)
    .innerJoin(handlers, eq(boats.handlerId, handlers.id))
    .where(
      and(eq(boats.name, params.boatName), eq(handlers.jettyId, jetty.id)),
    )
    .limit(1);
  if (!boat) throw new Error(`Boat missing at jetty: ${params.boatName}`);

  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.id, boat.handlerId))
    .limit(1);

  const seats = await db
    .select()
    .from(boatSeats)
    .where(eq(boatSeats.boatId, boat.id));
  const openSeats = seats.filter((s) => !s.blocked).slice(0, params.partySize);

  const [location] = await db
    .select()
    .from(locations)
    .where(
      and(eq(locations.jettyId, jetty.id), eq(locations.status, "OPEN")),
    )
    .limit(1);
  if (!location) throw new Error(`No open location at ${jetty.name}`);

  const tripDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const r = await createBookingWithSeats({
    userId: params.fisherId,
    locationId: location.id,
    boatId: boat.id,
    tripDate,
    startTime: params.startTime,
    endTime: params.endTime,
    partySize: params.partySize,
    seatIds: openSeats.map((s) => s.id),
  });

  const pay = await mockPayBooking(r.bookingId, params.fisherId);
  const scan1 = await scanBoardingToken({
    token: pay.token,
    handlerId: handler.id,
  });
  const scan2 = await scanBoardingToken({
    token: pay.token,
    handlerId: handler.id,
  });
  const taken = await getTakenSeatIds({
    boatId: boat.id,
    tripDate,
    startTime: params.startTime,
  });

  return {
    jetty: jetty.name,
    bookingId: r.bookingId,
    payRef: pay.mockRef,
    scan1: scan1.action,
    scan2: scan2.action,
    taken: taken.size,
  };
}

async function bookSplitBridge(params: { fisherId: string }) {
  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.slug, "penang-bridge-fishing"))
    .limit(1);
  if (!jetty) throw new Error("Bridge jetty missing");

  const [boat] = await db
    .select({
      id: boats.id,
      handlerId: boats.handlerId,
      capacity: boats.capacity,
    })
    .from(boats)
    .innerJoin(handlers, eq(boats.handlerId, handlers.id))
    .where(
      and(eq(boats.name, "Kepala Laut"), eq(handlers.jettyId, jetty.id)),
    )
    .limit(1);
  if (!boat) throw new Error("Kepala Laut missing");
  if (boat.capacity < 10) throw new Error("Need boat capacity >= 10 for split");

  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.id, boat.handlerId))
    .limit(1);

  const openLocs = await db
    .select()
    .from(locations)
    .where(
      and(eq(locations.jettyId, jetty.id), eq(locations.status, "OPEN")),
    )
    .limit(6);
  if (openLocs.length < 3) throw new Error("Need ≥3 open locations for split");

  const tripDate = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 10);
  const startTime = "18:00";
  const endTime = "22:00";
  const partySize = 10;

  const seats = await db
    .select()
    .from(boatSeats)
    .where(eq(boatSeats.boatId, boat.id));
  const openSeats = seats.filter((s) => !s.blocked).slice(0, partySize);
  if (openSeats.length < partySize) {
    throw new Error("Not enough seats for 10-pax split test");
  }

  // Overfill single tiang must fail
  let overfillBlocked = false;
  try {
    await createBookingWithSeats({
      userId: params.fisherId,
      locationId: openLocs[0]!.id,
      boatId: boat.id,
      tripDate,
      startTime: "06:00",
      endTime: "10:00",
      partySize: LOCATION_MAX_PAX + 1,
      seatIds: openSeats.slice(0, LOCATION_MAX_PAX + 1).map((s) => s.id),
    });
  } catch {
    overfillBlocked = true;
  }
  if (!overfillBlocked) {
    throw new Error("Expected max-4 single-location booking to fail");
  }

  const allocations = [
    { locationId: openLocs[0]!.id, pax: 4 },
    { locationId: openLocs[1]!.id, pax: 4 },
    { locationId: openLocs[2]!.id, pax: 2 },
  ];

  const created = await createTripGroupWithAllocations({
    userId: params.fisherId,
    boatId: boat.id,
    tripDate,
    startTime,
    endTime,
    partySize,
    seatIds: openSeats.map((s) => s.id),
    allocations,
  });

  for (const a of allocations) {
    const occ = await getLocationOccupancy(a.locationId, tripDate);
    if (occ < a.pax) {
      throw new Error(`Occupancy not held for ${a.locationId}`);
    }
  }

  const pay = await mockPayBooking(created.bookingId, params.fisherId);
  const scan1 = await scanBoardingToken({
    token: pay.token,
    handlerId: handler.id,
  });
  const scan2 = await scanBoardingToken({
    token: pay.token,
    handlerId: handler.id,
  });

  return {
    tripGroupId: created.tripGroupId,
    bookingId: created.bookingId,
    totalCents: created.totalCents,
    overfillBlocked,
    scan1: scan1.action,
    scan2: scan2.action,
    legs: allocations.length,
  };
}

async function main() {
  const [fisher] = await db
    .select()
    .from(users)
    .where(eq(users.email, "fisher@portmaster.local"));

  const jettyCount = await db.select({ id: jetties.id }).from(jetties);
  console.log("jetties_seeded", jettyCount.length);

  const a = await bookAtJetty({
    fisherId: fisher.id,
    jettySlug: "penang-bridge-fishing",
    boatName: "Sampan Merah",
    startTime: "14:00",
    endTime: "18:00",
    partySize: 2,
  });
  console.log("jetty_a", a);

  const b = await bookAtJetty({
    fisherId: fisher.id,
    jettySlug: "jeti-batu-uban-bukit-gelugor",
    boatName: "Angin Timur",
    startTime: "10:00",
    endTime: "14:00",
    partySize: 2,
  });
  console.log("jetty_b", b);

  if (a.jetty === b.jetty) {
    throw new Error("Smoke expected two different jetties");
  }

  const split = await bookSplitBridge({ fisherId: fisher.id });
  console.log("split_10_pax", split);

  // Ensure we did not accidentally use same booking as jetty_a
  if (split.bookingId === a.bookingId) {
    throw new Error("Split booking collided with earlier booking");
  }

  const unused = await db
    .select({ id: jetties.id })
    .from(jetties)
    .where(ne(jetties.slug, "x"));
  if (unused.length < 2) throw new Error("Unexpected jetty count");

  console.log("SMOKE_OK");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import "dotenv/config";
import { and, eq } from "drizzle-orm";
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
  getTakenSeatIds,
  mockPayBooking,
  scanBoardingToken,
} from "../src/lib/booking";

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

  console.log("SMOKE_OK");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

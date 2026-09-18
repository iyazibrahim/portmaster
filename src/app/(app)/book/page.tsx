import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { boatSeats, boats, handlers, jetties, locations } from "@/db/schema";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { getTakenSeatIds } from "@/lib/booking";
import { TIME_SLOTS } from "@/lib/utils-app";
import { format, addDays } from "date-fns";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";

export default async function BookPage() {
  const session = await requireSession();
  if (session.user.role === "HANDLER") redirect("/handler");

  const activeJetties = await db
    .select({
      id: jetties.id,
      name: jetties.name,
      area: jetties.area,
    })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  const openLocations = await db
    .select({
      id: locations.id,
      jettyId: locations.jettyId,
      number: locations.number,
      side: locations.side,
      name: locations.name,
    })
    .from(locations)
    .where(eq(locations.status, "OPEN"))
    .orderBy(locations.side, locations.number);

  const boatRows = await db
    .select({
      id: boats.id,
      jettyId: handlers.jettyId,
      name: boats.name,
      capacity: boats.capacity,
      pricePerPersonCents: boats.pricePerPersonCents,
      handlerName: handlers.displayName,
    })
    .from(boats)
    .innerJoin(handlers, eq(boats.handlerId, handlers.id))
    .where(eq(boats.active, true));

  const allSeats = await db.select().from(boatSeats);
  const seatsByBoat = new Map<string, typeof allSeats>();
  for (const s of allSeats) {
    const list = seatsByBoat.get(s.boatId) ?? [];
    list.push(s);
    seatsByBoat.set(s.boatId, list);
  }

  const boatOptions = boatRows.map((b) => ({
    ...b,
    seats: (seatsByBoat.get(b.id) ?? [])
      .slice()
      .sort((a, c) => a.row - c.row || a.col - c.col)
      .map((s) => ({
        id: s.id,
        label: s.label,
        row: s.row,
        col: s.col,
        blocked: s.blocked,
      })),
  }));

  const takenByBoatSlot: Record<string, string[]> = {};
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(), i), "yyyy-MM-dd"),
  );
  for (const boat of boatOptions) {
    for (const date of dates) {
      for (const slot of TIME_SLOTS) {
        const taken = await getTakenSeatIds({
          boatId: boat.id,
          tripDate: date,
          startTime: slot.start,
        });
        takenByBoatSlot[`${boat.id}|${date}|${slot.start}`] = [...taken];
      }
    }
  }

  return (
    <BookingWizard
      jetties={activeJetties}
      locations={openLocations}
      boats={boatOptions}
      takenByBoatSlot={takenByBoatSlot}
    />
  );
}

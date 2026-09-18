"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boatSeats, boats, handlers, jetties, locations } from "@/db/schema";
import { requireRole, requireSession } from "@/lib/session";
import {
  completeTrip,
  createTripGroupWithAllocations,
  mockPayBooking,
  scanBoardingToken,
  type LocationAllocation,
} from "@/lib/booking";
import { id } from "@/lib/utils-app";

function layoutForCapacity(capacity: number): { label: string; row: number; col: number }[] {
  const seats: { label: string; row: number; col: number }[] = [];
  let remaining = capacity;
  let row = 0;
  let n = 1;
  while (remaining > 0) {
    const cols = remaining === 1 ? 1 : Math.min(2, remaining);
    if (cols === 1) {
      seats.push({ label: `S${n}`, row, col: 1 });
      n += 1;
      remaining -= 1;
    } else {
      seats.push({ label: `S${n}`, row, col: 0 });
      n += 1;
      seats.push({ label: `S${n}`, row, col: 2 });
      n += 1;
      remaining -= 2;
    }
    row += 1;
  }
  return seats;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export async function actionCreateBooking(input: {
  boatId: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  seatIds: string[];
  allocations: LocationAllocation[];
}) {
  const session = await requireSession();
  if (session.user.role !== "USER" && session.user.role !== "ADMIN") {
    throw new Error("Only anglers can create bookings.");
  }
  const result = await createTripGroupWithAllocations({
    userId: session.user.id,
    ...input,
  });
  revalidatePath("/trips");
  return result;
}

export async function actionMockPay(bookingId: string) {
  const session = await requireSession();
  const result = await mockPayBooking(bookingId, session.user.id);
  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return {
    token: result.token,
    mockRef: result.mockRef,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function actionScanToken(token: string) {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler && session.user.role === "HANDLER") {
    throw new Error("Handler profile missing.");
  }

  let handlerId = handler?.id;
  if (!handlerId) {
    const [any] = await db.select().from(handlers).limit(1);
    if (!any) throw new Error("No handlers configured.");
    handlerId = any.id;
  }

  const result = await scanBoardingToken({ token, handlerId });
  revalidatePath("/handler");
  revalidatePath("/handler/scan");
  revalidatePath("/admin/ops");
  return {
    action: result.action,
    bookingId: result.booking.id,
    status: result.action === "CHECK_IN" ? "CHECKED_IN" : "COMPLETED",
  };
}

export async function actionCompleteTrip(bookingId: string) {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);
  if (!handler) throw new Error("Handler profile missing.");
  await completeTrip(bookingId, handler.id);
  revalidatePath("/handler");
  revalidatePath("/admin/ops");
}

export async function actionUpsertLocation(input: {
  id?: string;
  jettyId: string;
  number: number;
  side: "GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL";
  name: string;
  status: "OPEN" | "CLOSED";
  notes?: string;
}) {
  await requireRole(["ADMIN"]);
  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, input.jettyId))
    .limit(1);
  if (!jetty) throw new Error("Jetty not found.");

  if (input.id) {
    await db
      .update(locations)
      .set({
        jettyId: input.jettyId,
        number: input.number,
        side: input.side,
        name: input.name,
        status: input.status,
        notes: input.notes ?? null,
      })
      .where(eq(locations.id, input.id));
  } else {
    await db.insert(locations).values({
      id: id("loc"),
      jettyId: input.jettyId,
      number: input.number,
      side: input.side,
      name: input.name,
      status: input.status,
      notes: input.notes ?? null,
    });
  }
  revalidatePath("/admin/locations");
  revalidatePath("/admin/jetties");
  revalidatePath("/book");
}

export async function actionToggleLocationStatus(locationId: string) {
  await requireRole(["ADMIN"]);
  const [row] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, locationId))
    .limit(1);
  if (!row) throw new Error("Location not found");
  await db
    .update(locations)
    .set({ status: row.status === "OPEN" ? "CLOSED" : "OPEN" })
    .where(eq(locations.id, locationId));
  revalidatePath("/admin/locations");
}

export async function actionUpsertJetty(input: {
  id?: string;
  name: string;
  area?: string;
  slug?: string;
  notes?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  await requireRole(["ADMIN"]);
  const name = input.name.trim();
  if (!name) throw new Error("Jetty name is required.");
  const slug = (input.slug?.trim() || slugify(name)).slice(0, 64);
  if (!slug) throw new Error("Slug is required.");

  if (input.id) {
    await db
      .update(jetties)
      .set({
        name,
        area: input.area?.trim() || null,
        slug,
        notes: input.notes?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true,
      })
      .where(eq(jetties.id, input.id));
  } else {
    await db.insert(jetties).values({
      id: id("jty"),
      name,
      area: input.area?.trim() || null,
      slug,
      notes: input.notes?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    });
  }
  revalidatePath("/admin/jetties");
  revalidatePath("/admin/locations");
  revalidatePath("/book");
}

export async function actionToggleJettyActive(jettyId: string) {
  await requireRole(["ADMIN"]);
  const [row] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, jettyId))
    .limit(1);
  if (!row) throw new Error("Jetty not found");
  await db
    .update(jetties)
    .set({ active: !row.active })
    .where(eq(jetties.id, jettyId));
  revalidatePath("/admin/jetties");
  revalidatePath("/book");
}

export async function actionUpsertBoat(input: {
  id?: string;
  name: string;
  registration?: string;
  capacity: number;
  pricePerPersonCents: number;
  active: boolean;
}) {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);
  if (!handler) throw new Error("Handler profile missing.");

  if (input.capacity < 1 || input.capacity > 20) {
    throw new Error("Capacity must be between 1 and 20.");
  }
  if (!input.name.trim()) throw new Error("Boat name is required.");

  if (input.id) {
    const [existing] = await db
      .select()
      .from(boats)
      .where(eq(boats.id, input.id))
      .limit(1);
    if (!existing || existing.handlerId !== handler.id) {
      throw new Error("Boat not found.");
    }
    const capacityChanged = existing.capacity !== input.capacity;
    await db
      .update(boats)
      .set({
        name: input.name.trim(),
        registration: input.registration?.trim() || null,
        capacity: input.capacity,
        pricePerPersonCents: input.pricePerPersonCents,
        active: input.active,
      })
      .where(eq(boats.id, input.id));

    if (capacityChanged) {
      await db.delete(boatSeats).where(eq(boatSeats.boatId, input.id));
      const layout = layoutForCapacity(input.capacity);
      await db.insert(boatSeats).values(
        layout.map((s) => ({
          id: id("seat"),
          boatId: input.id!,
          label: s.label,
          row: s.row,
          col: s.col,
          blocked: false,
        })),
      );
    }
  } else {
    const boatId = id("bot");
    await db.insert(boats).values({
      id: boatId,
      handlerId: handler.id,
      name: input.name.trim(),
      registration: input.registration?.trim() || null,
      capacity: input.capacity,
      pricePerPersonCents: input.pricePerPersonCents,
      active: input.active,
    });
    const layout = layoutForCapacity(input.capacity);
    await db.insert(boatSeats).values(
      layout.map((s) => ({
        id: id("seat"),
        boatId,
        label: s.label,
        row: s.row,
        col: s.col,
        blocked: false,
      })),
    );
  }

  revalidatePath("/handler/boat");
  revalidatePath("/book");
}

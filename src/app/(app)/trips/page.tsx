import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { bookings, boats, jetties, locations } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { TripsList } from "@/components/trips/trips-list";

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
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My trips</h1>
          <p className="text-sm text-muted-foreground">
            Bookings, receipts, and boarding QR.
          </p>
        </div>
        <Link href="/book" className={cn(buttonVariants())}>
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
        <TripsList
          rows={primaries.map((r) => {
            const locs = locationLabels.get(r.tripGroupId) ?? [];
            return {
              id: r.id,
              tripDate: r.tripDate,
              startTime: r.startTime,
              endTime: r.endTime,
              status: r.status,
              jettyName: r.jettyName,
              boatName: r.boatName,
              locationSide: r.locationSide,
              dropOffs: locs.join(" · "),
              pax: groupPax.get(r.tripGroupId) ?? r.partySize,
              totalCents: groupTotals.get(r.tripGroupId) ?? r.totalCents,
            };
          })}
        />
      )}
    </div>
  );
}

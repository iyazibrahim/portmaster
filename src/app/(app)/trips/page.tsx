import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { bookings, boats, jetties, locations } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatMYR, sideLabel, tripSlotLabel } from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING_PAYMENT: "outline",
  CONFIRMED: "default",
  CHECKED_IN: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

export default async function TripsPage() {
  const session = await requireSession();

  const rows = await db
    .select({
      id: bookings.id,
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My trips</h1>
          <p className="text-muted-foreground">
            Bookings, receipts, and boarding QR.
          </p>
        </div>
        <Link href="/book" className={cn(buttonVariants(), "min-h-11")}>
          Book
        </Link>
      </div>

      {rows.length === 0 ? (
        <Alert>
          <AlertTitle>No trips yet</AlertTitle>
          <AlertDescription>
            Book a location trip to see it here with your seat map and QR pass.
          </AlertDescription>
        </Alert>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/trips/${r.id}`}
                className="flex min-h-16 items-center justify-between gap-3 py-3 hover:bg-accent/40"
              >
                <div>
                  <p className="font-medium">
                    {r.tripDate} · {tripSlotLabel(r.startTime, r.endTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.jettyName} · #{r.locationNumber} {sideLabel(r.locationSide)} ·{" "}
                    {r.boatName} · {r.partySize} pax · {formatMYR(r.totalCents)}
                  </p>
                </div>
                <Badge variant={statusVariant[r.status] ?? "secondary"}>
                  {r.status.replaceAll("_", " ")}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

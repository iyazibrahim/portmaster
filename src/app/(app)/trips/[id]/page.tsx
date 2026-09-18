import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { QRCodeSVG } from "qrcode.react";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import {
  bookingAccessTokens,
  bookingSeats,
  bookings,
  boatSeats,
  boats,
  handlers,
  jetties,
  payments,
  locations,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatMYR, sideLabel, tripSlotLabel } from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const [row] = await db
    .select({
      booking: bookings,
      boat: boats,
      location: locations,
      jetty: jetties,
      handler: handlers,
      payment: payments,
    })
    .from(bookings)
    .innerJoin(boats, eq(bookings.boatId, boats.id))
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .innerJoin(jetties, eq(bookings.jettyId, jetties.id))
    .innerJoin(handlers, eq(bookings.handlerId, handlers.id))
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.id, id), eq(bookings.userId, session.user.id)))
    .limit(1);

  if (!row) notFound();

  if (!row.booking.isPrimary) {
    const [primary] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.tripGroupId, row.booking.tripGroupId),
          eq(bookings.isPrimary, true),
          eq(bookings.userId, session.user.id),
        ),
      )
      .limit(1);
    if (primary) redirect(`/trips/${primary.id}`);
  }

  const groupLegs = await db
    .select({
      booking: bookings,
      location: locations,
    })
    .from(bookings)
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .where(eq(bookings.tripGroupId, row.booking.tripGroupId))
    .orderBy(asc(locations.number));

  const seats = await db
    .select({ label: boatSeats.label })
    .from(bookingSeats)
    .innerJoin(boatSeats, eq(bookingSeats.boatSeatId, boatSeats.id))
    .where(eq(bookingSeats.bookingId, row.booking.id));

  const [token] = await db
    .select()
    .from(bookingAccessTokens)
    .where(
      and(
        eq(bookingAccessTokens.bookingId, row.booking.id),
        eq(bookingAccessTokens.purpose, "BOARDING"),
      ),
    )
    .limit(1);

  const b = row.booking;
  const groupPax = groupLegs.reduce((s, l) => s + l.booking.partySize, 0);
  const groupTotal = groupLegs.reduce((s, l) => s + l.booking.totalCents, 0);
  const showQr =
    token &&
    !token.revokedAt &&
    ["CONFIRMED", "CHECKED_IN"].includes(b.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/trips"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "-ml-2 mb-2 inline-flex",
          )}
        >
          ← Trips
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Trip receipt</h1>
        <Badge className="mt-2">{b.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <dl className="space-y-3 border-y border-border py-4 text-sm lg:border-y-0 lg:border-r lg:pr-6 lg:py-0">
          <Row label="Date" value={b.tripDate} />
          <Row label="Slot" value={tripSlotLabel(b.startTime, b.endTime)} />
          <Row label="Jetty" value={row.jetty.name} />
          <Row label="Boat" value={row.boat.name} />
          <Row label="Handler" value={row.handler.displayName} />
          <Row label="Party" value={`${groupPax}`} />
          <Row
            label="Seats"
            value={seats.map((s) => s.label).join(", ") || "—"}
          />
          <Row label="Total" value={formatMYR(groupTotal)} />
          {row.payment?.mockRef ? (
            <Row label="Payment ref" value={row.payment.mockRef} />
          ) : null}
        </dl>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Drop-off locations</h2>
          <ul className="divide-y divide-border border-y border-border text-sm">
            {groupLegs.map((leg) => (
              <li
                key={leg.booking.id}
                className="flex justify-between gap-3 py-2"
              >
                <span>
                  #{leg.location.number} · {leg.location.name} ·{" "}
                  {sideLabel(leg.location.side)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {leg.booking.partySize} pax
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {b.status === "PENDING_PAYMENT" ? (
        <Alert>
          <AlertTitle>Awaiting payment</AlertTitle>
          <AlertDescription>
            Return to booking flow or contact support. Create a new booking if
            this hold expired.
          </AlertDescription>
        </Alert>
      ) : null}

      {showQr && token ? (
        <div className="space-y-3 border-t border-border pt-5 text-center lg:text-left lg:flex lg:items-start lg:gap-8">
          <div className="space-y-3 lg:flex-1">
            <p className="text-sm font-medium">Boarding QR</p>
            <p className="text-xs text-muted-foreground">
              One pass for the whole trip group
              {groupLegs.length > 1
                ? ` (${groupLegs.length} locations)`
                : ""}
              . Show this to the boatman for check-in and check-out at the
              jetty.
            </p>
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              {token.token}
            </p>
            <p className="text-xs text-muted-foreground">
              Opaque server token · expires{" "}
              {token.expiresAt.toLocaleString("en-MY")}
            </p>
          </div>
          <div className="mx-auto inline-block rounded-md border border-border bg-white p-3 lg:mx-0">
            <QRCodeSVG value={token.token} size={200} level="M" />
          </div>
        </div>
      ) : b.status === "COMPLETED" ? (
        <Alert>
          <AlertTitle>Trip completed</AlertTitle>
          <AlertDescription>Boarding QR is no longer active.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

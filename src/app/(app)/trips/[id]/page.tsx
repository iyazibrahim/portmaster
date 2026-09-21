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
import { StatusBadge } from "@/components/status-badge";
import { formatMYR, sideLabel, tripSlotLabel } from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/trips"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 mb-2 inline-flex",
          )}
        >
          ← Trips
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Trip receipt</h1>
          <StatusBadge status={b.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drop-off locations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {groupLegs.map((leg) => (
                <li
                  key={leg.booking.id}
                  className="flex justify-between gap-3 border-b border-border py-2 last:border-0"
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
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Boarding QR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
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

import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
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

  const seats = await db
    .select({ label: boatSeats.label })
    .from(bookingSeats)
    .innerJoin(boatSeats, eq(bookingSeats.boatSeatId, boatSeats.id))
    .where(eq(bookingSeats.bookingId, id));

  const [token] = await db
    .select()
    .from(bookingAccessTokens)
    .where(
      and(
        eq(bookingAccessTokens.bookingId, id),
        eq(bookingAccessTokens.purpose, "BOARDING"),
      ),
    )
    .limit(1);

  const b = row.booking;
  const showQr =
    token &&
    !token.revokedAt &&
    ["CONFIRMED", "CHECKED_IN"].includes(b.status);

  return (
    <div className="mx-auto max-w-lg space-y-6">
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

      <dl className="space-y-3 border-y border-border py-4 text-sm">
        <Row label="Date" value={b.tripDate} />
        <Row
          label="Slot"
          value={tripSlotLabel(b.startTime, b.endTime)}
        />
        <Row label="Jetty" value={row.jetty.name} />
        <Row
          label="Location"
          value={`#${row.location.number} · ${row.location.name} · ${sideLabel(row.location.side)}`}
        />
        <Row label="Boat" value={row.boat.name} />
        <Row label="Handler" value={row.handler.displayName} />
        <Row label="Party" value={`${b.partySize}`} />
        <Row
          label="Seats"
          value={seats.map((s) => s.label).join(", ") || "—"}
        />
        <Row label="Total" value={formatMYR(b.totalCents)} />
        {row.payment?.mockRef ? (
          <Row label="Payment ref" value={row.payment.mockRef} />
        ) : null}
      </dl>

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
        <div className="space-y-3 border-t border-border pt-5 text-center">
          <p className="text-sm font-medium">Boarding QR</p>
          <div className="mx-auto inline-block rounded-md border border-border bg-white p-3">
            <QRCodeSVG value={token.token} size={200} level="M" />
          </div>
          <p className="break-all font-mono text-[10px] text-muted-foreground">
            {token.token}
          </p>
          <p className="text-xs text-muted-foreground">
            Opaque server token · expires{" "}
            {token.expiresAt.toLocaleString("en-MY")}
          </p>
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

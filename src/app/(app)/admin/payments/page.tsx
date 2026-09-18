import { Suspense } from "react";
import { asc, desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { bookings, boats, jetties, locations, payments, users } from "@/db/schema";
import { sideLabel } from "@/lib/utils-app";
import { JettyFilter } from "@/components/admin/jetty-filter";
import { PaymentsTable } from "@/components/admin/payments-table";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ jetty?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { jetty: jettyParam } = await searchParams;

  const jettyOptions = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  const jettyId =
    jettyParam && jettyParam !== "all"
      ? jettyOptions.find((j) => j.id === jettyParam)?.id
      : undefined;

  const rows = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      status: payments.status,
      mockRef: payments.mockRef,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      tripDate: bookings.tripDate,
      angler: users.name,
      boat: boats.name,
      jettyName: jetties.name,
      locationNumber: locations.number,
      locationSide: locations.side,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(boats, eq(bookings.boatId, boats.id))
    .innerJoin(locations, eq(bookings.locationId, locations.id))
    .innerJoin(jetties, eq(bookings.jettyId, jetties.id))
    .where(jettyId ? eq(bookings.jettyId, jettyId) : sql`true`)
    .orderBy(desc(payments.createdAt))
    .limit(100);

  const unpaid = rows.filter((r) => r.status === "PENDING").length;
  const paid = rows.filter((r) => r.status === "PAID").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Mock collection table · {paid} paid · {unpaid} unpaid in latest 100.
        </p>
      </div>

      <Suspense fallback={null}>
        <JettyFilter jetties={jettyOptions} />
      </Suspense>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <PaymentsTable
          rows={rows.map((r) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            angler: r.angler,
            tripLabel: `${r.tripDate} · ${r.jettyName} · #${r.locationNumber} ${sideLabel(r.locationSide)} · ${r.boat}`,
            amountCents: r.amountCents,
            status: r.status,
            mockRef: r.mockRef,
          }))}
        />
      )}
    </div>
  );
}

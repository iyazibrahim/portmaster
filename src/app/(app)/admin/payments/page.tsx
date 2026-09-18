import { Suspense } from "react";
import { asc, desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { bookings, boats, jetties, locations, payments, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { formatMYR, sideLabel } from "@/lib/utils-app";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JettyFilter } from "@/components/admin/jetty-filter";

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
    <div className="space-y-6">
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Angler</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {r.createdAt.toLocaleString("en-MY")}
                  </TableCell>
                  <TableCell>{r.angler}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.tripDate} · {r.jettyName} · #{r.locationNumber}{" "}
                    {sideLabel(r.locationSide)} · {r.boat}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatMYR(r.amountCents)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "PAID"
                          ? "default"
                          : r.status === "PENDING"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.mockRef ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

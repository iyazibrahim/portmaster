import { asc, count } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, jetties, locations } from "@/db/schema";
import { JettyAdmin } from "@/components/admin/jetty-admin";

export default async function AdminJettiesPage() {
  await requireRole(["ADMIN"]);

  const jettyRows = await db
    .select()
    .from(jetties)
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  const locationCounts = await db
    .select({
      jettyId: locations.jettyId,
      n: count(),
    })
    .from(locations)
    .groupBy(locations.jettyId);

  const handlerCounts = await db
    .select({
      jettyId: handlers.jettyId,
      n: count(),
    })
    .from(handlers)
    .groupBy(handlers.jettyId);

  const locMap = new Map(locationCounts.map((r) => [r.jettyId, Number(r.n)]));
  const hdlMap = new Map(handlerCounts.map((r) => [r.jettyId, Number(r.n)]));

  const rows = jettyRows.map((j) => ({
    id: j.id,
    name: j.name,
    area: j.area,
    slug: j.slug,
    active: j.active,
    notes: j.notes,
    sortOrder: j.sortOrder,
    lat: j.lat,
    lng: j.lng,
    geofenceRadiusM: j.geofenceRadiusM,
    locationCount: locMap.get(j.id) ?? 0,
    handlerCount: hdlMap.get(j.id) ?? 0,
  }));

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jetties</h1>
        <p className="text-muted-foreground">
          MVP1 is scoped to four boarding jetties around Jambatan Pulau Pinang.
          Other Penang landings stay listed but inactive. {activeCount} active
          of {rows.length}.
        </p>
      </div>
      <JettyAdmin initial={rows} />
    </div>
  );
}

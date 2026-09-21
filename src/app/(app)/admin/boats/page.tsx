import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boatOwners, boats, handlers, jetties } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { AdminBoatsPanel } from "@/components/admin/admin-boats-panel";

export default async function AdminBoatsPage() {
  await requireRole(["ADMIN"]);
  const rows = await db
    .select({
      id: boats.id,
      name: boats.name,
      registration: boats.registration,
      status: boats.status,
      capacity: boats.capacity,
      ownerId: boats.ownerId,
      owner: boatOwners.name,
      jettyId: boats.jettyId,
      jetty: jetties.name,
      operator: handlers.displayName,
      permitExpiresAt: boats.permitExpiresAt,
    })
    .from(boats)
    .leftJoin(boatOwners, eq(boats.ownerId, boatOwners.id))
    .leftJoin(jetties, eq(boats.jettyId, jetties.id))
    .leftJoin(handlers, eq(boats.handlerId, handlers.id));

  const owners = await db
    .select({
      id: boatOwners.id,
      name: boatOwners.name,
      jettyId: boatOwners.jettyId,
    })
    .from(boatOwners)
    .where(eq(boatOwners.active, true));

  const jettyRows = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder));

  const handlerRows = await db
    .select({
      id: handlers.id,
      name: handlers.displayName,
      jettyId: handlers.jettyId,
    })
    .from(handlers);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Boats</h1>
        <p className="text-sm text-muted-foreground">
          Association fleet master data. Only Active boats with valid permits
          are operational.
        </p>
      </div>
      <AdminBoatsPanel
        boats={rows.map((r) => ({
          ...r,
          permitExpiresAt: r.permitExpiresAt?.toISOString() ?? null,
        }))}
        owners={owners}
        jetties={jettyRows}
        handlers={handlerRows}
      />
    </div>
  );
}

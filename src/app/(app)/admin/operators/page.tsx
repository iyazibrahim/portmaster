import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boatOwners, handlers, jetties, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OperatorsAdminTable } from "@/components/admin/operators-admin-table";

export default async function AdminOperatorsPage() {
  await requireRole(["ADMIN"]);
  const rows = await db
    .select({
      id: handlers.id,
      displayName: handlers.displayName,
      licenseNo: handlers.licenseNo,
      jettyId: handlers.jettyId,
      jetty: jetties.name,
      ownerId: handlers.boatOwnerId,
      owner: boatOwners.name,
      email: users.email,
      userId: handlers.userId,
    })
    .from(handlers)
    .leftJoin(jetties, eq(handlers.jettyId, jetties.id))
    .leftJoin(boatOwners, eq(handlers.boatOwnerId, boatOwners.id))
    .leftJoin(users, eq(handlers.userId, users.id));

  const jettyRows = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true));

  const ownerRows = await db
    .select({ id: boatOwners.id, name: boatOwners.name })
    .from(boatOwners);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Boat Operators
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit display name, jetty, owner, and optional operator licence. Create
          login accounts under People (role Operator).
        </p>
      </div>
      <OperatorsAdminTable
        rows={rows}
        jetties={jettyRows}
        owners={ownerRows}
      />
    </div>
  );
}

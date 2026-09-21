import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { passes, users, locations, jetties } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PassesAdminTable } from "@/components/admin/passes-admin-table";

export default async function AdminPassesPage() {
  await requireRole(["ADMIN"]);
  const rows = await db
    .select({
      id: passes.id,
      reference: passes.reference,
      status: passes.status,
      validOn: passes.validOn,
      feeCents: passes.feeCents,
      angler: users.name,
      pillar: locations.name,
      jetty: jetties.name,
    })
    .from(passes)
    .leftJoin(users, eq(passes.userId, users.id))
    .leftJoin(locations, eq(passes.pillarId, locations.id))
    .leftJoin(jetties, eq(passes.jettyId, jetties.id))
    .orderBy(desc(passes.createdAt))
    .limit(500);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Fishing Passes
        </h1>
        <p className="text-sm text-muted-foreground">
          Same-day Association passes. Search and browse 15 per page.
        </p>
      </div>
      <PassesAdminTable rows={rows} />
    </div>
  );
}

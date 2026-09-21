import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, jetties, users } from "@/db/schema";
import { PeopleAdmin } from "@/components/admin/people-admin";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  const people = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      accountStatus: users.accountStatus,
      handlerName: handlers.displayName,
      handlerJettyId: handlers.jettyId,
      handlerJettyName: jetties.name,
    })
    .from(users)
    .leftJoin(handlers, eq(handlers.userId, users.id))
    .leftJoin(jetties, eq(handlers.jettyId, jetties.id));

  const jettyRows = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">
          Manage anglers, boatmen, and admins.
        </p>
      </div>
      <PeopleAdmin people={people} jetties={jettyRows} />
    </div>
  );
}

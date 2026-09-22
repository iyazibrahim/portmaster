import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, jetties, users } from "@/db/schema";
import { PeopleAdmin } from "@/components/admin/people-admin";
import { getTranslator } from "@/i18n";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();

  const people = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      accountStatus: users.accountStatus,
      handlerId: handlers.id,
      handlerName: handlers.displayName,
      handlerJettyId: handlers.jettyId,
      handlerJettyName: jetties.name,
      handlerLicenseNo: handlers.licenseNo,
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
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.peopleTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("admin.peopleSub")}</p>
      </div>
      <PeopleAdmin people={people} jetties={jettyRows} />
    </div>
  );
}

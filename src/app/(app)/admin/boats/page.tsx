import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boatOwners, boats, handlers, jetties, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { AdminBoatsPanel } from "@/components/admin/admin-boats-panel";
import { OperatorsAdminTable } from "@/components/admin/operators-admin-table";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { getTranslator } from "@/i18n";

export default async function AdminBoatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "operators" ? "operators" : "boats";

  const jettyRows = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("admin.fleetTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("admin.fleetSub")}
        </p>
      </div>

      <AdminPageTabs
        tabs={[
          {
            href: "/admin/boats",
            label: t("nav.boats"),
            active: tab === "boats",
          },
          {
            href: "/admin/boats?tab=operators",
            label: t("nav.operators"),
            active: tab === "operators",
          },
        ]}
      />

      {tab === "operators" ? (
        <OperatorsSection jetties={jettyRows} />
      ) : (
        <BoatsSection jetties={jettyRows} />
      )}
    </div>
  );
}

async function BoatsSection({
  jetties: jettyRows,
}: {
  jetties: { id: string; name: string }[];
}) {
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

  const handlerRows = await db
    .select({
      id: handlers.id,
      name: handlers.displayName,
      jettyId: handlers.jettyId,
    })
    .from(handlers);

  return (
    <AdminBoatsPanel
      boats={rows.map((r) => ({
        ...r,
        permitExpiresAt: r.permitExpiresAt?.toISOString() ?? null,
      }))}
      owners={owners}
      jetties={jettyRows}
      handlers={handlerRows}
    />
  );
}

async function OperatorsSection({
  jetties: jettyRows,
}: {
  jetties: { id: string; name: string }[];
}) {
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

  const ownerRows = await db
    .select({ id: boatOwners.id, name: boatOwners.name })
    .from(boatOwners);

  return (
    <OperatorsAdminTable rows={rows} jetties={jettyRows} owners={ownerRows} />
  );
}

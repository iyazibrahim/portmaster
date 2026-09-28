import { asc, count, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, jetties, locations } from "@/db/schema";
import { LocationAdmin } from "@/components/admin/location-admin";
import { JettyAdmin } from "@/components/admin/jetty-admin";
import { AdminPageTabs } from "@/components/admin/admin-page-tabs";
import { getTranslator } from "@/i18n";

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "jetties" ? "jetties" : "pillars";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("admin.sitesTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("admin.sitesSub")}
        </p>
      </div>

      <AdminPageTabs
        tabs={[
          {
            href: "/admin/locations",
            label: t("nav.pillars"),
            active: tab === "pillars",
          },
          {
            href: "/admin/locations?tab=jetties",
            label: t("nav.jetties"),
            active: tab === "jetties",
          },
        ]}
      />

      {tab === "jetties" ? <JettiesSection /> : <PillarsSection />}
    </div>
  );
}

async function PillarsSection() {
  const jettyRows = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  const rows = await db
    .select({
      id: locations.id,
      jettyId: locations.jettyId,
      jettyName: jetties.name,
      number: locations.number,
      side: locations.side,
      name: locations.name,
      status: locations.status,
      maxOccupancy: locations.maxOccupancy,
      notes: locations.notes,
    })
    .from(locations)
    .innerJoin(jetties, eq(locations.jettyId, jetties.id))
    .where(eq(jetties.active, true))
    .orderBy(
      asc(jetties.sortOrder),
      asc(locations.side),
      asc(locations.number),
    );

  return <LocationAdmin initial={rows} jetties={jettyRows} />;
}

async function JettiesSection() {
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

  return <JettyAdmin initial={rows} />;
}

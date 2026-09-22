import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { jetties, locations } from "@/db/schema";
import { LocationAdmin } from "@/components/admin/location-admin";
import { getTranslator } from "@/i18n";

export default async function AdminLocationsPage() {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.pillarsTitle")}
        </h1>
        <p className="text-muted-foreground">{t("admin.pillarsSub")}</p>
      </div>
      <LocationAdmin initial={rows} jetties={jettyRows} />
    </div>
  );
}

import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boats, boatOwners, handlers, jetties } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  HandlerFleetPanel,
  type HandlerFleetBoat,
} from "@/components/handler/handler-fleet-panel";
import { getTranslator } from "@/i18n";

export default async function HandlerFleetPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const { t } = await getTranslator();
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("handler.noProfile")}</AlertTitle>
        <AlertDescription>{t("handler.linkFirst")}</AlertDescription>
      </Alert>
    );
  }

  const selectFields = {
    id: boats.id,
    name: boats.name,
    registration: boats.registration,
    capacity: boats.capacity,
    status: boats.status,
    owner: boatOwners.name,
    jettyName: jetties.name,
    permitExpiresAt: boats.permitExpiresAt,
    licenceInfo: boats.licenceInfo,
    pricePerPersonCents: boats.pricePerPersonCents,
  };

  const rows = handler.boatOwnerId
    ? await db
        .select(selectFields)
        .from(boats)
        .leftJoin(boatOwners, eq(boats.ownerId, boatOwners.id))
        .leftJoin(jetties, eq(boats.jettyId, jetties.id))
        .where(eq(boats.ownerId, handler.boatOwnerId))
    : await db
        .select(selectFields)
        .from(boats)
        .leftJoin(boatOwners, eq(boats.ownerId, boatOwners.id))
        .leftJoin(jetties, eq(boats.jettyId, jetties.id))
        .where(eq(boats.handlerId, handler.id));

  const fleetBoats: HandlerFleetBoat[] = rows.map((b) => ({
    id: b.id,
    name: b.name,
    registration: b.registration,
    capacity: b.capacity,
    status: b.status,
    owner: b.owner,
    jettyName: b.jettyName,
    permitExpiresAt: b.permitExpiresAt?.toISOString() ?? null,
    licenceInfo: b.licenceInfo,
    pricePerPersonCents: b.pricePerPersonCents,
  }));

  return <HandlerFleetPanel boats={fleetBoats} />;
}

import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boats, boatSeats, handlers } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FleetManager } from "@/components/handler/fleet-manager";

export default async function HandlerFleetPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No handler profile</AlertTitle>
        <AlertDescription>Link this user to a handler first.</AlertDescription>
      </Alert>
    );
  }

  const myBoats = await db
    .select()
    .from(boats)
    .where(eq(boats.handlerId, handler.id));

  const seats = await db.select().from(boatSeats);

  const fleet = myBoats.map((b) => ({
    id: b.id,
    name: b.name,
    registration: b.registration,
    capacity: b.capacity,
    active: b.active,
    pricePerPersonCents: b.pricePerPersonCents,
    seatLabels: seats
      .filter((s) => s.boatId === b.id)
      .sort((a, c) => a.row - c.row || a.col - c.col)
      .map((s) => `${s.label}${s.blocked ? " (blocked)" : ""}`),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fleet</h1>
        <p className="text-muted-foreground">{handler.displayName}</p>
      </div>
      <FleetManager boats={fleet} />
    </div>
  );
}

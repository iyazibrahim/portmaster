import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boats, boatOwners, handlers } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEnumLabel } from "@/lib/utils-app";

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
        <AlertTitle>No operator profile</AlertTitle>
        <AlertDescription>Link this user to an operator first.</AlertDescription>
      </Alert>
    );
  }

  const myBoats = handler.boatOwnerId
    ? await db
        .select({
          id: boats.id,
          name: boats.name,
          registration: boats.registration,
          capacity: boats.capacity,
          status: boats.status,
          owner: boatOwners.name,
        })
        .from(boats)
        .leftJoin(boatOwners, eq(boats.ownerId, boatOwners.id))
        .where(eq(boats.ownerId, handler.boatOwnerId))
    : await db
        .select({
          id: boats.id,
          name: boats.name,
          registration: boats.registration,
          capacity: boats.capacity,
          status: boats.status,
          owner: boatOwners.name,
        })
        .from(boats)
        .leftJoin(boatOwners, eq(boats.ownerId, boatOwners.id))
        .where(eq(boats.handlerId, handler.id));

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fleet</h1>
        <p className="text-muted-foreground">
          {handler.displayName} · view only (Association Admin maintains boats)
        </p>
      </div>
      {myBoats.length === 0 ? (
        <Alert>
          <AlertTitle>No boats</AlertTitle>
          <AlertDescription>
            Ask Association Admin to assign boats to your owner account.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Reg</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myBoats.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.registration ?? "—"}</TableCell>
                  <TableCell>{b.owner ?? "—"}</TableCell>
                  <TableCell>{b.capacity}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatEnumLabel(b.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

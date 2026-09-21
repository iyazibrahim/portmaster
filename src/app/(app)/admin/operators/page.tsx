import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boatOwners, handlers, jetties, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOperatorsPage() {
  await requireRole(["ADMIN"]);
  const rows = await db
    .select({
      id: handlers.id,
      displayName: handlers.displayName,
      licenseNo: handlers.licenseNo,
      jetty: jetties.name,
      owner: boatOwners.name,
      email: users.email,
    })
    .from(handlers)
    .leftJoin(jetties, eq(handlers.jettyId, jetties.id))
    .leftJoin(boatOwners, eq(handlers.boatOwnerId, boatOwners.id))
    .leftJoin(users, eq(handlers.userId, users.id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Boat Operators</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operators / Skippers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Jetty</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Licence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.displayName}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.jetty}</TableCell>
                  <TableCell>{r.owner ?? "—"}</TableCell>
                  <TableCell>{r.licenseNo ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

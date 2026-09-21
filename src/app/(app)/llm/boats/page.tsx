import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { boatOwners, boats, jetties } from "@/db/schema";
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

export default async function LlmBoatsPage() {
  await requireRole(["LLM_VIEWER", "ADMIN"]);
  const rows = await db
    .select({
      id: boats.id,
      name: boats.name,
      registration: boats.registration,
      status: boats.status,
      capacity: boats.capacity,
      owner: boatOwners.name,
      jetty: jetties.name,
    })
    .from(boats)
    .leftJoin(boatOwners, eq(boats.ownerId, boatOwners.id))
    .leftJoin(jetties, eq(boats.jettyId, jetties.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Boats</h1>
        <p className="text-sm text-muted-foreground">View only fleet list.</p>
      </div>
      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Reg</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Jetty</TableHead>
              <TableHead>Cap</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.registration ?? "—"}</TableCell>
                <TableCell>{r.owner ?? "—"}</TableCell>
                <TableCell>{r.jetty ?? "—"}</TableCell>
                <TableCell>{r.capacity}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatEnumLabel(r.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

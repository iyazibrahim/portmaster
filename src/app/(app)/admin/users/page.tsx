import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, users } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateAdminForm } from "@/components/admin/create-admin-form";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);
  const people = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      handlerName: handlers.displayName,
    })
    .from(users)
    .leftJoin(handlers, eq(handlers.userId, users.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-muted-foreground">
          Users, handlers, and admins. Admins manage open tiangs from LLM
          guidance.
        </p>
      </div>

      <CreateAdminForm />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Handler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>
                  <Badge>{p.role}</Badge>
                </TableCell>
                <TableCell>{p.handlerName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

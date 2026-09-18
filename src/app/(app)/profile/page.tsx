import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage() {
  const session = await requireSession();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account details used for bookings and boarding.
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="min-h-11">
            Sign out
          </Button>
        </form>
      </div>

      <dl className="grid gap-x-8 gap-y-4 border-y border-border py-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="mt-1 font-medium">{session.user.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="mt-1 break-all font-medium">{session.user.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="mt-1 font-medium">{user?.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Emergency contact</dt>
          <dd className="mt-1 font-medium">{user?.emergencyContact ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="mt-1">
            <Badge>{session.user.role}</Badge>
          </dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Read our{" "}
        <Link
          href="/policy"
          className="text-primary underline-offset-4 hover:underline"
        >
          Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/consent"
          className="text-primary underline-offset-4 hover:underline"
        >
          Consent
        </Link>
        .
      </p>
    </div>
  );
}

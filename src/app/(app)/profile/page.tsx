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
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your angler identity for bookings, boarding QR, and emergency contact
          on the jetty. Install PortMaster to your home screen for a faster
          phone experience.
        </p>
      </div>
      <dl className="space-y-3 border-y border-border py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{session.user.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium break-all">{session.user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-medium">{user?.phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Emergency contact</dt>
          <dd className="font-medium">{user?.emergencyContact ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <Badge>{session.user.role}</Badge>
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Read our{" "}
        <Link href="/policy" className="text-primary underline-offset-4 hover:underline">
          Policy
        </Link>{" "}
        and{" "}
        <Link href="/consent" className="text-primary underline-offset-4 hover:underline">
          Consent
        </Link>
        .
      </p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="min-h-11 w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}

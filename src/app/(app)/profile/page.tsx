import { eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await requireSession();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account details used for bookings and boarding.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
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
              <dd className="mt-1 font-medium">
                {user?.emergencyContact ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="mt-1">
                <Badge>{session.user.role}</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardFooter>
      </Card>

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

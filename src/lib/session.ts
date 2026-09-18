import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/db/schema";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect("/");
  }
  return session;
}

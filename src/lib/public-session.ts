import type { UserRole } from "@/db/schema";

/**
 * Fields safe to return from GET /api/auth/session.
 * The database user row also holds the password hash and MyKad hash.
 */
export function toPublicSession(input: {
  expires: Date | string | null | undefined;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole | null;
  };
}) {
  const expires =
    input.expires instanceof Date
      ? input.expires.toISOString()
      : typeof input.expires === "string" && input.expires
        ? input.expires
        : new Date(0).toISOString();

  return {
    expires,
    user: {
      id: input.user.id,
      name: input.user.name ?? null,
      email: input.user.email ?? null,
      image: input.user.image ?? null,
      role: input.user.role ?? "USER",
    },
  };
}

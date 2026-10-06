import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  SESSION_MAX_AGE_SEC,
  shouldUseSecureAuthCookies,
} from "@/lib/auth-cookies";
import { toPublicSession } from "@/lib/public-session";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  type UserRole,
} from "@/db/schema";
import type { Adapter } from "@auth/core/adapters";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role?: UserRole;
  }
}

const drizzleAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
}) as Adapter;

/**
 * Auth.js with database sessions (HTTP-only cookie → sessions table).
 * Credentials login is handled by `loginWithCredentials` server action,
 * which creates the session row and sets the session cookie directly —
 * Auth.js Credentials provider cannot use database session strategy.
 */
export const { handlers, auth, signOut } = NextAuth({
  adapter: drizzleAdapter,
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  trustHost: true,
  useSecureCookies: shouldUseSecureAuthCookies(),
  callbacks: {
    async session({ session, user }) {
      let role = (user as { role?: UserRole }).role;
      if (!role) {
        const [row] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        role = row?.role ?? "USER";
      }
      // Database strategy spreads the session row and the full users row
      // into this callback. Return only the fields the client may see.
      return toPublicSession({
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role,
        },
      });
    },
  },
});

import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
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
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const role = (user as { role?: UserRole }).role;
        if (role) {
          session.user.role = role;
        } else {
          const [row] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);
          session.user.role = row?.role ?? "USER";
        }
      }
      return session;
    },
  },
  trustHost: true,
});

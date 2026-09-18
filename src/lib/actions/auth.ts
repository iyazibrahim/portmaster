"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { signOut as authSignOut } from "@/lib/auth";
import { id } from "@/lib/utils-app";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

export type LoginResult =
  | { ok: true; role: string }
  | { ok: false; error: string };

export type SignUpResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalized = email.toLowerCase().trim();
  if (!normalized || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);

  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true, role: user.role };
}

export async function signUpAngler(input: {
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  password: string;
  acceptPolicy: boolean;
}): Promise<SignUpResult> {
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  const phone = input.phone.trim();
  const emergencyContact = input.emergencyContact.trim();

  if (!name || !email || !phone || !emergencyContact || !input.password) {
    return { ok: false, error: "All fields are required." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!input.acceptPolicy) {
    return { ok: false, error: "You must accept the Policy to create an account." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  await db.insert(users).values({
    id: id("usr"),
    name,
    email,
    phone,
    emergencyContact,
    passwordHash,
    role: "USER",
    policyAcceptedAt: new Date(),
  });

  return { ok: true };
}

export async function logoutAction() {
  try {
    await authSignOut({ redirect: false });
  } catch {
    // fall through — clear cookie + session row manually
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
  }
  cookieStore.delete(COOKIE_NAME);
  redirect("/");
}

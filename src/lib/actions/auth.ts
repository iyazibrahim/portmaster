"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db, pg } from "@/db";
import { sessions, users } from "@/db/schema";
import { signOut as authSignOut } from "@/lib/auth";
import {
  authSessionCookieName,
  safeInternalPath,
  shouldUseSecureAuthCookies,
} from "@/lib/auth-cookies";
import { validateAnglerIdentity } from "@/domain/pass";
import {
  hashMyKad,
  id,
  myKadLast4,
  parseMyKadDob,
} from "@/lib/utils-app";
import { asSqlTimestamp } from "@/lib/sql-value";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function formatDbError(err: unknown): string {
  const chunks: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; depth < 5 && cur; depth += 1) {
    if (cur instanceof Error) {
      chunks.push(cur.message);
      cur = (cur as Error & { cause?: unknown }).cause;
      continue;
    }
    if (typeof cur === "object" && cur) {
      const row = cur as {
        code?: string;
        detail?: string;
        message?: string;
        constraint_name?: string;
      };
      const bit = [row.code, row.constraint_name, row.detail, row.message]
        .filter(Boolean)
        .join(" ");
      if (bit) chunks.push(bit);
    }
    break;
  }
  return chunks.join(" | ").replace(/\s+/g, " ").trim().slice(0, 280);
}

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export type SignUpResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginWithCredentials(
  email: string,
  password: string,
  next?: string,
): Promise<LoginResult> {
  let step = "start";
  try {
    const normalized = email.toLowerCase().trim();
    if (!normalized || !password) {
      return { ok: false, error: "Email and password are required." };
    }

    step = "lookup";
    // Always hit public.users — a shadowed users view/table caused SELECT-ok + FK-fail.
    const found = await pg<
      {
        id: string;
        password_hash: string;
        role: string;
        account_status: string;
      }[]
    >`
      select id, password_hash, role::text as role, account_status::text as account_status
      from public.users
      where lower(email) = ${normalized}
      limit 1
    `;
    const row = found[0];
    if (!row?.id) {
      return { ok: false, error: "Invalid email or password." };
    }

    // Confirm PK exists in the same table the FK references (guards ghost rows).
    const alive = await pg<{ id: string }[]>`
      select id from public.users where id = ${row.id} limit 1
    `;
    if (!alive[0]?.id) {
      return {
        ok: false,
        error:
          "Account row is inconsistent in the database. Redeploy so boot can repair demo admin.",
      };
    }

    if (row.account_status === "BLACKLISTED") {
      return { ok: false, error: "This account has been blacklisted." };
    }

    if (!row.password_hash) {
      return { ok: false, error: "Invalid email or password." };
    }

    step = "password";
    let valid = false;
    try {
      valid = await bcrypt.compare(password, row.password_hash);
    } catch (hashErr) {
      console.error("[loginWithCredentials] bcrypt", hashErr);
      return {
        ok: false,
        error: "This account has a broken password hash. Ask admin to reset it.",
      };
    }
    if (!valid) {
      return { ok: false, error: "Invalid email or password." };
    }

    step = "session";
    const sessionToken = randomBytes(32).toString("hex");
    // ISO string — never interpolate a JS Date into postgres.js tagged SQL.
    const expiresIso = asSqlTimestamp(
      Date.now() + SESSION_MAX_AGE_SEC * 1000,
    );

    await pg`delete from public.sessions where user_id = ${row.id}`;
    try {
      await pg`
        insert into public.sessions (session_token, user_id, expires)
        values (${sessionToken}, ${row.id}, ${expiresIso}::timestamptz)
      `;
    } catch (sessionErr) {
      console.error("[loginWithCredentials:session]", {
        userId: row.id,
        email: normalized,
        role: row.role,
        err: sessionErr,
      });
      throw sessionErr;
    }

    step = "cookie";
    const cookieStore = await cookies();
    const secure = shouldUseSecureAuthCookies();
    cookieStore.set(authSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
      secure,
    });

    return { ok: true, redirectTo: safeInternalPath(next, row.role) };
  } catch (err) {
    console.error(`[loginWithCredentials:${step}]`, err);
    return {
      ok: false,
      error: `Sign in failed (${step}): ${formatDbError(err)}`,
    };
  }
}

export async function signUpAngler(input: {
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  emergencyContactName: string;
  address: string;
  myKad: string;
  citizenship: string;
  dob?: string;
  password: string;
  acceptPolicy: boolean;
  acceptPdpa: boolean;
  acceptLocation: boolean;
  photoBase64?: string;
  photoMimeType?: string;
}): Promise<SignUpResult> {
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  const phone = input.phone.trim();
  const emergencyContact = input.emergencyContact.trim();
  const emergencyContactName = input.emergencyContactName.trim();
  const address = input.address.trim();

  if (
    !name ||
    !email ||
    !phone ||
    !emergencyContact ||
    !emergencyContactName ||
    !address ||
    !input.myKad ||
    !input.password
  ) {
    return { ok: false, error: "All required fields must be filled." };
  }
  if (!input.photoBase64 || !input.photoMimeType) {
    return { ok: false, error: "Profile photo is required." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(input.photoMimeType)) {
    return { ok: false, error: "Photo must be JPEG, PNG, or WebP." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!input.acceptPolicy || !input.acceptPdpa || !input.acceptLocation) {
    return {
      ok: false,
      error: "You must accept Policy, PDPA, and location consent.",
    };
  }

  const dobFromIc = parseMyKadDob(input.myKad);
  const dob = input.dob?.trim() || dobFromIc;
  if (!dob) {
    return {
      ok: false,
      error: "Could not derive date of birth from MyKad. Enter DOB manually.",
    };
  }

  const identity = validateAnglerIdentity({
    myKad: input.myKad,
    citizenship: input.citizenship,
    dob,
  });
  if (!identity.ok) return { ok: false, error: identity.error };

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const myKadHash = hashMyKad(identity.myKad);
  const [existingIc] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.myKadHash, myKadHash))
    .limit(1);
  if (existingIc) {
    return {
      ok: false,
      error: "An account with this MyKad already exists.",
    };
  }

  const userId = id("usr");
  const bytes = Buffer.from(input.photoBase64, "base64");
  if (bytes.length > 1_000_000) {
    return { ok: false, error: "Photo must be under 1 MB." };
  }
  const { saveProfilePhoto } = await import("@/lib/photos");
  const photoKey = await saveProfilePhoto({
    userId,
    bytes,
    mimeType: input.photoMimeType,
  });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const now = new Date();
  await db.insert(users).values({
    id: userId,
    name,
    email,
    phone,
    emergencyContact,
    emergencyContactName,
    address,
    myKadHash,
    myKadLast4: myKadLast4(identity.myKad),
    dob,
    citizenship: "MY",
    photoKey,
    passwordHash,
    role: "USER",
    accountStatus: "ACTIVE",
    policyAcceptedAt: now,
    pdpaAcceptedAt: now,
    locationConsentAt: now,
  });

  return { ok: true };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangePasswordResult> {
  const { requireSession } = await import("@/lib/session");
  const session = await requireSession();

  const current = input.currentPassword ?? "";
  const next = input.newPassword ?? "";
  const confirm = input.confirmPassword ?? "";

  if (!current || !next || !confirm) {
    return { ok: false, error: "All password fields are required." };
  }
  if (next.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { ok: false, error: "New password and confirmation do not match." };
  }
  if (next === current) {
    return {
      ok: false,
      error: "New password must be different from the current password.",
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(next, 10);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  return { ok: true };
}

export async function updateProfilePhotoAction(input: {
  photoBase64: string;
  photoMimeType: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { requireSession } = await import("@/lib/session");
  const session = await requireSession();

  if (!input.photoBase64 || !input.photoMimeType) {
    return { ok: false, error: "Photo is required." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(input.photoMimeType)) {
    return { ok: false, error: "Photo must be JPEG, PNG, or WebP." };
  }

  const bytes = Buffer.from(input.photoBase64, "base64");
  if (bytes.length > 1_000_000) {
    return { ok: false, error: "Photo must be under 1 MB." };
  }

  const { saveProfilePhoto } = await import("@/lib/photos");
  const photoKey = await saveProfilePhoto({
    userId: session.user.id,
    bytes,
    mimeType: input.photoMimeType,
  });

  await db
    .update(users)
    .set({ photoKey })
    .where(eq(users.id, session.user.id));

  return { ok: true };
}

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfileDetailsAction(input: {
  phone: string;
  emergencyContactName: string;
  emergencyContact: string;
  address: string;
}): Promise<ProfileUpdateResult> {
  const { requireSession } = await import("@/lib/session");
  const session = await requireSession();

  const phone = input.phone.trim();
  const emergencyContactName = input.emergencyContactName.trim();
  const emergencyContact = input.emergencyContact.trim();
  const address = input.address.trim();

  if (!phone || !emergencyContact || !emergencyContactName || !address) {
    return { ok: false, error: "Phone, address, and emergency contact are required." };
  }

  await db
    .update(users)
    .set({
      phone,
      emergencyContactName,
      emergencyContact,
      address,
    })
    .where(eq(users.id, session.user.id));

  return { ok: true };
}

export async function deleteAccountAction(input: {
  password: string;
  confirmText: string;
}): Promise<ProfileUpdateResult> {
  const { requireSession } = await import("@/lib/session");
  const { writeAudit } = await import("@/lib/audit");
  const { passes } = await import("@/db/schema");
  const { and, eq: eqCol, inArray } = await import("drizzle-orm");

  const session = await requireSession();

  if (input.confirmText.trim().toUpperCase() !== "DELETE") {
    return { ok: false, error: 'Type DELETE to confirm account deletion.' };
  }
  if (!input.password) {
    return { ok: false, error: "Password is required." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) return { ok: false, error: "Account not found." };

  if (user.role === "ADMIN") {
    return {
      ok: false,
      error: "Admin accounts cannot self-delete. Ask another admin.",
    };
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) return { ok: false, error: "Password is incorrect." };

  const [activeTrip] = await db
    .select({ id: passes.id })
    .from(passes)
    .where(
      and(
        eqCol(passes.userId, user.id),
        inArray(passes.status, ["CHECKED_IN", "PENDING_PAYMENT", "ACTIVE"]),
      ),
    )
    .limit(1);
  if (activeTrip) {
    return {
      ok: false,
      error:
        "Finish or cancel any active / checked-in pass before deleting your account.",
    };
  }

  const scrubbedEmail = `deleted.${user.id}@deleted.local`;
  const scrubHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  const { deleteUserPhotos } = await import("@/lib/photos");
  await deleteUserPhotos(user.id);

  await db
    .update(users)
    .set({
      name: "Deleted User",
      email: scrubbedEmail,
      phone: null,
      emergencyContact: null,
      emergencyContactName: null,
      address: null,
      myKadHash: null,
      myKadLast4: null,
      dob: null,
      citizenship: null,
      photoKey: null,
      passwordHash: scrubHash,
      accountStatus: "SUSPENDED",
      image: null,
    })
    .where(eq(users.id, user.id));

  await db.delete(sessions).where(eq(sessions.userId, user.id));

  await writeAudit({
    actorId: user.id,
    action: "user.delete_account",
    entityType: "user",
    entityId: user.id,
    meta: { anonymised: true },
  });

  const cookieStore = await cookies();
  cookieStore.delete(authSessionCookieName());

  return { ok: true };
}

export async function logoutAction() {
  try {
    await authSignOut({ redirect: false });
  } catch {
    // fall through
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(authSessionCookieName())?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
  }
  cookieStore.delete(authSessionCookieName());
  redirect("/");
}

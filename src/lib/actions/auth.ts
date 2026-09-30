"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, pg } from "@/db";
import { sessions, users, verificationTokens } from "@/db/schema";
import { signOut as authSignOut } from "@/lib/auth";
import {
  authSessionCookieName,
  safeInternalPath,
  shouldUseSecureAuthCookies,
} from "@/lib/auth-cookies";
import { validateAnglerIdentity } from "@/domain/pass";
import {
  malaysianAddressError,
  validateMalaysianAddress,
} from "@/lib/my-address";
import { isValidEmail } from "@/lib/email";
import {
  hashMyKad,
  id,
  myKadLast4,
  parseMyKadDob,
} from "@/lib/utils-app";
import { asSqlTimestamp } from "@/lib/sql-value";
import {
  generateResetToken,
  getAppBaseUrl,
  getSupportEmail,
  hashResetToken,
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MINUTES,
  PASSWORD_RESET_TTL_MS,
  safeEqualHex,
  sendMail,
} from "@/lib/mail";
import { buildPasswordResetEmail } from "@/lib/emails/password-reset";
import {
  hashPassword,
  validateStrongPassword,
  verifyPassword,
} from "@/lib/password";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import {
  forgotPasswordSchema,
  loginBodySchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

async function recordAuthAudit(input: Parameters<typeof writeAudit>[0]) {
  try {
    await writeAudit(input);
  } catch (err) {
    console.error("[audit]", input.action, err);
  }
}

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const RATE_WINDOW_MS = 60_000;

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
    const parsed = loginBodySchema.safeParse({ email, password, next });
    if (!parsed.success) {
      return { ok: false, error: "Email and password are required." };
    }
    const normalized = parsed.data.email.toLowerCase().trim();
    const pwd = parsed.data.password;

    const ip = await clientIpFromHeaders();
    const limited = rateLimit({
      key: `login:${ip}:${normalized}`,
      limit: 5,
      windowMs: RATE_WINDOW_MS,
    });
    if (!limited.ok) {
      return {
        ok: false,
        error: `Too many sign-in attempts. Try again in ${limited.retryAfterSec}s.`,
      };
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
      await recordAuthAudit({
        action: "auth.login_failed",
        entityType: "user",
        meta: { email: normalized },
      });
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
      await recordAuthAudit({
        actorId: row.id,
        action: "auth.login_failed",
        entityType: "user",
        entityId: row.id,
      });
      return { ok: false, error: "Invalid email or password." };
    }

    step = "password";
    let valid = false;
    try {
      valid = await verifyPassword(pwd, row.password_hash);
    } catch (hashErr) {
      console.error("[loginWithCredentials] bcrypt", hashErr);
      return {
        ok: false,
        error: "This account has a broken password hash. Ask admin to reset it.",
      };
    }
    if (!valid) {
      await recordAuthAudit({
        actorId: row.id,
        action: "auth.login_failed",
        entityType: "user",
        entityId: row.id,
      });
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

    await recordAuthAudit({
      actorId: row.id,
      action: "auth.login_success",
      entityType: "user",
      entityId: row.id,
    });

    return {
      ok: true,
      redirectTo: safeInternalPath(parsed.data.next, row.role),
    };
  } catch (err) {
    console.error(`[loginWithCredentials:${step}]`, err);
    // Do not leak DB / internal details to the client.
    return {
      ok: false,
      error: "Sign in failed. Please try again.",
    };
  }
}

export async function signUpAngler(input: {
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  emergencyContactName: string;
  addressUnit: string;
  addressStreet: string;
  addressPostcode: string;
  addressState: string;
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
  const ip = await clientIpFromHeaders();
  const limited = rateLimit({
    key: `signup:${ip}`,
    limit: 3,
    windowMs: RATE_WINDOW_MS,
  });
  if (!limited.ok) {
    return {
      ok: false,
      error: `Too many sign-up attempts. Try again in ${limited.retryAfterSec}s.`,
    };
  }

  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();
  const phone = input.phone.trim();
  const emergencyContact = input.emergencyContact.trim();
  const emergencyContactName = input.emergencyContactName.trim();
  const addressCheck = validateMalaysianAddress({
    unit: input.addressUnit,
    street: input.addressStreet,
    postcode: input.addressPostcode,
    stateId: input.addressState,
  });

  if (
    !name ||
    !email ||
    !phone ||
    !emergencyContact ||
    !emergencyContactName ||
    !input.myKad ||
    !input.password
  ) {
    return { ok: false, error: "All required fields must be filled." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!addressCheck.ok) {
    return { ok: false, error: malaysianAddressError(addressCheck.code) };
  }
  const address = addressCheck.formatted;
  if (!input.photoBase64 || !input.photoMimeType) {
    return { ok: false, error: "Profile photo is required." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(input.photoMimeType)) {
    return { ok: false, error: "Photo must be JPEG, PNG, or WebP." };
  }
  const pwdCheck = validateStrongPassword(input.password);
  if (!pwdCheck.ok) {
    return { ok: false, error: pwdCheck.error };
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

  const passwordHash = await hashPassword(input.password);
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
  const strong = validateStrongPassword(next);
  if (!strong.ok) {
    return { ok: false, error: strong.error };
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

  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(next);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  return { ok: true };
}

const RESET_IDENTIFIER_PREFIX = "password-reset:";

export type ForgotPasswordResult = { ok: true };

export async function requestPasswordResetAction(
  emailRaw: string,
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: emailRaw });
  const email = parsed.success
    ? parsed.data.email.toLowerCase().trim()
    : "";
  // Always succeed to the client (avoid account enumeration).
  if (!email) {
    return { ok: true };
  }

  const ip = await clientIpFromHeaders();
  const limited = rateLimit({
    key: `forgot:${ip}:${email}`,
    limit: 3,
    windowMs: RATE_WINDOW_MS,
  });
  if (!limited.ok) {
    return { ok: true };
  }

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { ok: true };
    }

    const identifier = `${RESET_IDENTIFIER_PREFIX}${email}`;
    const [existing] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.identifier, identifier))
      .limit(1);

    if (existing) {
      const createdAt =
        existing.expires.getTime() - PASSWORD_RESET_TTL_MS;
      if (Date.now() - createdAt < PASSWORD_RESET_COOLDOWN_MS) {
        // Cooldown: do not rotate token or re-send (still generic OK).
        return { ok: true };
      }
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, identifier));
    }

    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await db.insert(verificationTokens).values({
      identifier,
      token: tokenHash,
      expires,
    });

    const base = await getAppBaseUrl();
    // Token-only URL — do not put email in the query string.
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const supportEmail = await getSupportEmail();
    const mail = buildPasswordResetEmail({
      recipientName: user.name || "there",
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      supportEmail,
    });

    const sent = await sendMail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      console.error("[password-reset] email failed", sent.error);
      // Still return ok to the client; ops can check logs / SMTP settings.
    }
  } catch (e) {
    console.error("[password-reset] request failed", e);
  }

  return { ok: true };
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resetPasswordWithTokenAction(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ||
      "Password must meet the strength requirements.";
    return { ok: false, error: msg };
  }
  const token = parsed.data.token;
  const next = parsed.data.newPassword;
  const confirm = parsed.data.confirmPassword;

  if (next !== confirm) {
    return { ok: false, error: "New password and confirmation do not match." };
  }

  const tokenHash = hashResetToken(token);
  const now = new Date();

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, tokenHash),
        gt(verificationTokens.expires, now),
      ),
    )
    .limit(1);

  if (
    !row ||
    !row.identifier.startsWith(RESET_IDENTIFIER_PREFIX) ||
    !safeEqualHex(row.token, tokenHash)
  ) {
    return {
      ok: false,
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const email = row.identifier.slice(RESET_IDENTIFIER_PREFIX.length);
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, row.identifier));
    return {
      ok: false,
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const passwordHash = await hashPassword(next);

  // Consume token first (single-use), then update password + kill sessions.
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, row.identifier));

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  await db.delete(sessions).where(eq(sessions.userId, user.id));

  await recordAuthAudit({
    actorId: user.id,
    action: "auth.password_reset",
    entityType: "user",
    entityId: user.id,
  });

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

  const valid = await verifyPassword(input.password, user.passwordHash);
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
  const scrubHash = await hashPassword(randomBytes(32).toString("hex"));

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

/** Revoke every database session for the signed-in user (all devices). */
export async function logoutAllDevicesAction() {
  const { requireSession } = await import("@/lib/session");
  const session = await requireSession();
  try {
    await authSignOut({ redirect: false });
  } catch {
    // fall through
  }
  await db.delete(sessions).where(eq(sessions.userId, session.user.id));
  const cookieStore = await cookies();
  cookieStore.delete(authSessionCookieName());
  redirect("/");
}

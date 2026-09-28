import bcrypt from "bcryptjs";
import {
  getPasswordChecks,
  passwordChecksOk,
  PASSWORD_HINT_EN,
} from "@/lib/password-policy";

/** bcrypt work factor for all new password hashes. */
export const BCRYPT_COST = 12;

/**
 * Strong password for signup / password reset.
 * Min 8 chars + upper + lower + digit + symbol.
 */
export function validateStrongPassword(
  password: string,
): { ok: true } | { ok: false; error: string } {
  const checks = getPasswordChecks(password);
  if (!passwordChecksOk(checks)) {
    return { ok: false, error: PASSWORD_HINT_EN };
  }
  return { ok: true };
}

export function passwordPolicyHint() {
  return PASSWORD_HINT_EN;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, passwordHash: string) {
  return bcrypt.compare(plain, passwordHash);
}

import { createHmac, timingSafeEqual } from "crypto";

export const IT_UNLOCK_MINUTES = 20;

function signingSecret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (!value) return null;
  return value;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`it-settings:${payload}`)
    .digest("base64url");
}

/** Signed unlock cookie. A plain future timestamp is not enough. */
export function signItUnlock(now = Date.now()) {
  const secret = signingSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET is required to unlock IT settings.");
  }
  const expires = now + IT_UNLOCK_MINUTES * 60 * 1000;
  const payload = String(expires);
  return {
    value: `${payload}.${signature(payload, secret)}`,
    maxAgeSec: IT_UNLOCK_MINUTES * 60,
    minutes: IT_UNLOCK_MINUTES,
  };
}

export function verifyItUnlock(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const secret = signingSecret();
  if (!secret) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires <= now) return false;
  const expected = signature(payload, secret);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

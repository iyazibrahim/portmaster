import { z } from "zod";
import { validateStrongPassword } from "@/lib/password";

const strongPassword = z.string().superRefine((val, ctx) => {
  const check = validateStrongPassword(val);
  if (!check.ok) {
    ctx.addIssue({ code: "custom", message: check.error });
  }
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

export const signupPasswordSchema = strongPassword;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(200),
  newPassword: strongPassword,
  confirmPassword: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const boardingScanSchema = z.object({
  token: z.string().trim().min(1).max(500),
  lat: z.string().max(32).optional(),
  lng: z.string().max(32).optional(),
  clientEventId: z.string().max(120).optional(),
  expectedAction: z.enum(["CHECK_IN", "CHECK_OUT"]).optional(),
});

export const boardingPreviewSchema = z.object({
  token: z.string().trim().min(1).max(500),
});

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        /* plain token */
      }
    }
    return { token: trimmed };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

/** QR value, or the token query/path when the code encodes a link. */
export function normalizeQrToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const fromQuery =
      url.searchParams.get("token") || url.searchParams.get("qr");
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    /* opaque token */
  }
  return trimmed;
}

function tokenFromRecord(record: Record<string, unknown>) {
  const tokenRaw =
    record.token ?? record.qr ?? record.qrToken ?? record.passToken ?? "";
  const text =
    typeof tokenRaw === "string"
      ? tokenRaw
      : tokenRaw == null
        ? ""
        : String(tokenRaw);
  return normalizeQrToken(text);
}

function coord(value: unknown) {
  if (value == null || value === "") return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.slice(0, 32);
}

function expectedAction(value: unknown) {
  if (typeof value !== "string") return undefined;
  const text = value.trim().toUpperCase();
  if (text === "CHECK_IN" || text === "CHECK_OUT") return text;
  return undefined;
}

/**
 * Preview accepts `{ token }`. Scan used to reject that same token when
 * lat/lng arrived as null or numbers, and the route reported it as a missing token.
 */
export function parseBoardingScanBody(raw: unknown) {
  const record = asRecord(raw) ?? {};
  const clientEventId =
    typeof record.clientEventId === "string"
      ? record.clientEventId.trim().slice(0, 120)
      : undefined;
  return boardingScanSchema.safeParse({
    token: tokenFromRecord(record),
    lat: coord(record.lat),
    lng: coord(record.lng),
    clientEventId: clientEventId || undefined,
    expectedAction: expectedAction(record.expectedAction),
  });
}

export function parseBoardingPreviewBody(raw: unknown) {
  const record = asRecord(raw) ?? {};
  return boardingPreviewSchema.safeParse({
    token: tokenFromRecord(record),
  });
}

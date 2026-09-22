import { createHash } from "crypto";
import { nanoid } from "nanoid";

export function id(prefix?: string) {
  return prefix ? `${prefix}_${nanoid(16)}` : nanoid(21);
}

export function opaqueToken() {
  return nanoid(32);
}

export function formatMYR(cents: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

export function tripSlotLabel(startTime: string, endTime: string) {
  return `${startTime} – ${endTime}`;
}

export const TIME_SLOTS = [
  { start: "06:00", end: "10:00", label: "Morning 06:00–10:00" },
  { start: "10:00", end: "14:00", label: "Midday 10:00–14:00" },
  { start: "14:00", end: "18:00", label: "Afternoon 14:00–18:00" },
  { start: "18:00", end: "22:00", label: "Evening 18:00–22:00" },
] as const;

/** Hard cap: anglers per pillar / location per calendar day. */
export const LOCATION_MAX_PAX = 4;
export const PILLAR_MAX_PAX = LOCATION_MAX_PAX;
export const ASSOCIATION_FEE_CENTS = 500;
export const DEFAULT_RESERVATION_MINUTES = 10;
export const DEFAULT_OVERDUE_HOURS = 8;

export function sideLabel(side: string) {
  if (side === "GEORGETOWN") return "Georgetown";
  if (side === "SEBERANG_PERAI") return "Seberang Perai";
  if (side === "GENERAL") return "General";
  return formatEnumLabel(side);
}

/** CHECKED_OUT → "Checked Out", PENDING_PAYMENT → "Pending Payment". */
export function formatEnumLabel(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function roleLabel(role: string) {
  if (role === "USER") return "Angler";
  if (role === "HANDLER") return "Operator";
  if (role === "ADMIN") return "Admin";
  if (role === "LLM_VIEWER") return "LLM Viewer";
  return formatEnumLabel(role);
}

/** Calendar date in Asia/Kuala_Lumpur as YYYY-MM-DD. */
export function todayMYT(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Add calendar days to a YYYY-MM-DD string (UTC date arithmetic). */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Default expected return = next calendar day after validOn. */
export function defaultExpectedReturnOn(validOn: string): string {
  return addCalendarDays(validOn, 1);
}

/** Max nights beyond validOn for overnight stay intention (Phase B). */
export const DEFAULT_MAX_OVERNIGHT_NIGHTS = 3;

export function normalizeMyKad(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function hashMyKad(raw: string): string {
  const normalized = normalizeMyKad(raw);
  return createHash("sha256").update(normalized).digest("hex");
}

export function myKadLast4(raw: string): string {
  const normalized = normalizeMyKad(raw);
  return normalized.slice(-4);
}

/** Malaysian MyKad: 12 digits. First 6 = YYMMDD. */
export function parseMyKadDob(raw: string): string | null {
  const n = normalizeMyKad(raw);
  if (!/^\d{12}$/.test(n)) return null;
  const yy = Number(n.slice(0, 2));
  const mm = Number(n.slice(2, 4));
  const dd = Number(n.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  return `${year.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
}

export function ageFromDob(dob: string, onDate = todayMYT()): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [cy, cm, cd] = onDate.split("-").map(Number);
  let age = cy - y;
  if (cm < m || (cm === m && cd < d)) age -= 1;
  return age;
}

/**
 * Seed/demo anglers can buy multiple same-day passes for testing.
 * Or set ALLOW_MULTI_PASS_PER_DAY=true in .env.
 */
export function canBuyMultiplePassesToday(email: string | null | undefined) {
  if (process.env.ALLOW_MULTI_PASS_PER_DAY === "true") return true;
  return isSeedDemoAngler(email);
}

/**
 * Seed/demo anglers may buy without being at the jetty (testing only).
 * Or set ALLOW_PASS_GEO_BYPASS=true in .env.
 */
export function canBypassPassGeofence(email: string | null | undefined) {
  if (process.env.ALLOW_PASS_GEO_BYPASS === "true") return true;
  return isSeedDemoAngler(email);
}

function isSeedDemoAngler(email: string | null | undefined) {
  const e = (email ?? "").trim().toLowerCase();
  return e === "fisher@tiangpass.local" || e === "siti@tiangpass.local";
}

export function passReference(): string {
  const day = todayMYT().replace(/-/g, "");
  return `PM-${day}-${nanoid(6).toUpperCase()}`;
}

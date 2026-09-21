/**
 * Pure domain helpers for Association fishing passes.
 * Occupancy, reservation, and status transitions — no DB I/O here.
 */

import {
  ASSOCIATION_FEE_CENTS,
  DEFAULT_RESERVATION_MINUTES,
  PILLAR_MAX_PAX,
  ageFromDob,
  normalizeMyKad,
  todayMYT,
} from "@/lib/utils-app";
import type { LocationStatus, PassStatus } from "@/db/schema";

/** Statuses that hold a pillar slot. */
export const PASS_OCCUPANCY_STATUSES: PassStatus[] = [
  "PENDING_PAYMENT",
  "ACTIVE",
  "CHECKED_IN",
];

/** Statuses that block buying another pass the same day. */
export const PASS_BLOCKING_STATUSES: PassStatus[] = [
  "PENDING_PAYMENT",
  "ACTIVE",
  "CHECKED_IN",
  "CHECKED_OUT",
];

/** Only Available pillars accept new purchases. */
export const PILLAR_SELLABLE_STATUS: LocationStatus = "AVAILABLE";

export type OccupancyInput = {
  /** Passes already holding the pillar (any occupancy status). */
  heldCount: number;
  /** Pending-payment rows whose reservedUntil is in the past. */
  expiredReservationCount?: number;
};

export function remainingSlots(input: OccupancyInput, max = PILLAR_MAX_PAX): number {
  const expired = input.expiredReservationCount ?? 0;
  const effective = Math.max(0, input.heldCount - expired);
  return Math.max(0, max - effective);
}

export function canReserveSlot(input: OccupancyInput, max = PILLAR_MAX_PAX): boolean {
  return remainingSlots(input, max) >= 1;
}

export function reservationExpiresAt(
  from = new Date(),
  minutes = DEFAULT_RESERVATION_MINUTES,
): Date {
  return new Date(from.getTime() + minutes * 60_000);
}

export function isReservationExpired(
  reservedUntil: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!reservedUntil) return false;
  return reservedUntil.getTime() <= now.getTime();
}

export type IdentityCheckInput = {
  myKad: string;
  citizenship: string;
  dob: string;
  onDate?: string;
};

export type IdentityCheckResult =
  | { ok: true; age: number; myKad: string }
  | { ok: false; error: string };

export function validateAnglerIdentity(
  input: IdentityCheckInput,
): IdentityCheckResult {
  const myKad = normalizeMyKad(input.myKad);
  if (!/^\d{12}$/.test(myKad)) {
    return { ok: false, error: "MyKad must be 12 digits." };
  }
  const citizenship = input.citizenship.trim().toUpperCase();
  if (citizenship !== "MY" && citizenship !== "MALAYSIAN") {
    return {
      ok: false,
      error: "Only Malaysian citizens can register (v1).",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dob)) {
    return { ok: false, error: "Date of birth is required (YYYY-MM-DD)." };
  }
  const age = ageFromDob(input.dob, input.onDate ?? todayMYT());
  if (age < 14) {
    return { ok: false, error: "Anglers must be at least 14 years old." };
  }
  return { ok: true, age, myKad };
}

export type CreatePassRulesInput = {
  accountStatus: "ACTIVE" | "SUSPENDED" | "BLACKLISTED";
  existingSameDayStatuses: PassStatus[];
  pillarStatus: LocationStatus | string;
  pillarJettyId: string;
  boardingJettyId: string;
  occupancy: OccupancyInput;
  maxOccupancy?: number;
  boatOwnerJettyId?: string | null;
  validOn?: string;
  /** Testing / demo: skip one-pass-per-day rule. */
  allowMultipleSameDay?: boolean;
};

export type CreatePassRulesResult =
  | { ok: true; validOn: string; feeCents: number }
  | { ok: false; error: string };

export function assertCanCreatePass(
  input: CreatePassRulesInput,
): CreatePassRulesResult {
  if (input.accountStatus !== "ACTIVE") {
    return {
      ok: false,
      error: "Your account is blocked from buying passes.",
    };
  }
  const validOn = input.validOn ?? todayMYT();
  if (validOn !== todayMYT()) {
    return { ok: false, error: "Only same-day passes can be purchased." };
  }
  const blocking = input.existingSameDayStatuses.some((s) =>
    PASS_BLOCKING_STATUSES.includes(s),
  );
  if (blocking && !input.allowMultipleSameDay) {
    return {
      ok: false,
      error: "You already have a pass for today (one pass per person per day).",
    };
  }
  if (input.pillarStatus !== PILLAR_SELLABLE_STATUS) {
    return { ok: false, error: "This pillar is not available for purchase." };
  }
  if (input.pillarJettyId !== input.boardingJettyId) {
    return {
      ok: false,
      error: "Pillar must belong to the selected boarding jetty.",
    };
  }
  if (
    input.boatOwnerJettyId &&
    input.boatOwnerJettyId !== input.boardingJettyId
  ) {
    return {
      ok: false,
      error: "Boat owner must operate at the selected boarding jetty.",
    };
  }
  const max = input.maxOccupancy ?? PILLAR_MAX_PAX;
  if (!canReserveSlot(input.occupancy, max)) {
    return {
      ok: false,
      error: `Pillar is full (max ${max} anglers).`,
    };
  }
  return { ok: true, validOn, feeCents: ASSOCIATION_FEE_CENTS };
}

export function nextStatusAfterPaymentSuccess(
  current: PassStatus,
): PassStatus | null {
  if (current === "PENDING_PAYMENT") return "ACTIVE";
  return null;
}

export function nextStatusAfterPaymentFail(
  current: PassStatus,
): PassStatus | null {
  if (current === "PENDING_PAYMENT") return "CANCELLED";
  return null;
}

export function nextStatusAfterCheckIn(current: PassStatus): PassStatus | null {
  if (current === "ACTIVE") return "CHECKED_IN";
  return null;
}

export function nextStatusAfterCheckOut(
  current: PassStatus,
): PassStatus | null {
  if (current === "CHECKED_IN") return "CHECKED_OUT";
  return null;
}

export function canCancelPass(current: PassStatus): boolean {
  return current === "ACTIVE" || current === "PENDING_PAYMENT";
}

export function isOverdue(
  checkedInAt: Date | null | undefined,
  overdueHours: number,
  now = new Date(),
): boolean {
  if (!checkedInAt) return false;
  return now.getTime() - checkedInAt.getTime() >= overdueHours * 3_600_000;
}

/**
 * Unused Active passes expire after their calendar day (MYT).
 * Checked-In is never expired by date — operator must check out.
 */
export function shouldExpireActivePass(
  status: PassStatus,
  validOn: string,
  today = todayMYT(),
): boolean {
  return status === "ACTIVE" && validOn < today;
}

export function endOfDayMYT(dateStr: string): Date {
  // Approximate: treat as Asia/Kuala_Lumpur end of day via UTC+8 offset
  return new Date(`${dateStr}T23:59:59.999+08:00`);
}

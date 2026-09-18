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

/** Hard cap: people per tiang / location per trip date (boat capacity is separate). */
export const LOCATION_MAX_PAX = 4;

export function sideLabel(side: string) {
  if (side === "GEORGETOWN") return "Georgetown";
  if (side === "SEBERANG_PERAI") return "Seberang Perai";
  if (side === "GENERAL") return "General";
  return side;
}

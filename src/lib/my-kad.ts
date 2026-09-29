/** Strip spaces and dashes. Safe to import from client code. */
export function normalizeMyKad(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

function digitsOnly(raw: string) {
  return normalizeMyKad(raw).replace(/\D/g, "");
}

/** 12 digits shown as YYMMDD-PB-XXXX, for example 900101-14-5678. */
export function formatMyKad(raw: string) {
  const digits = digitsOnly(raw).slice(0, 12);
  let out = digits.slice(0, 6);
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8)}`;
  return out;
}

/**
 * Date of birth from the first six MyKad digits (YYMMDD).
 * Returns null until those digits are a real calendar date.
 * Year: 00–30 is 2000s, otherwise 1900s.
 */
export function parseMyKadDobPrefix(raw: string): string | null {
  const n = digitsOnly(raw);
  if (n.length < 6) return null;
  const yy = Number(n.slice(0, 2));
  const mm = Number(n.slice(2, 4));
  const dd = Number(n.slice(4, 6));
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  const parsed = new Date(Date.UTC(year, mm - 1, dd));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== mm - 1 ||
    parsed.getUTCDate() !== dd
  ) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
}

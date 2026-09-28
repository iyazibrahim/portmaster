/** Client-safe password policy checks (no Node crypto). */

export type PasswordChecks = {
  minLength: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordChecksOk(checks: PasswordChecks) {
  return (
    checks.minLength &&
    checks.upper &&
    checks.lower &&
    checks.number &&
    checks.symbol
  );
}

/** 0–4 met rules beyond emptiness; used for strength bar. */
export function passwordStrengthLevel(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const c = getPasswordChecks(password);
  const met = [
    c.minLength,
    c.upper,
    c.lower,
    c.number,
    c.symbol,
  ].filter(Boolean).length;
  if (met <= 1) return 1;
  if (met === 2) return 2;
  if (met === 3 || met === 4) return 3;
  return 4;
}

export const PASSWORD_HINT_EN =
  "At least 8 characters, with uppercase, lowercase, a number, and a symbol.";

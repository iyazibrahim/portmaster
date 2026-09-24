/** Payment gateway env + helpers. Admin `payment_gateway` picks primary. */

export type GatewayId = "mock" | "stripe" | "hitpay";

export function hasStripeKeys(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function hasHitPayKeys(): boolean {
  return Boolean(process.env.HITPAY_API_KEY?.trim());
}

export function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return key;
}

export function stripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  return secret;
}

/** @deprecated Prefer hasHitPayKeys + Admin payment_gateway. */
export function isHitPayEnabled(): boolean {
  return hasHitPayKeys();
}

export function hitPayApiKey(): string {
  const key = process.env.HITPAY_API_KEY?.trim();
  if (!key) throw new Error("HITPAY_API_KEY is not set.");
  return key;
}

export function hitPayApiUrl(): string {
  const base =
    process.env.HITPAY_API_URL?.trim() || "https://api.sandbox.hit-pay.com";
  return base.replace(/\/$/, "");
}

export function hitPayWebhookSalt(): string {
  const salt = process.env.HITPAY_WEBHOOK_SALT?.trim();
  if (!salt) throw new Error("HITPAY_WEBHOOK_SALT is not set.");
  return salt;
}

export function hitPayCurrency(): string {
  return (process.env.HITPAY_CURRENCY?.trim() || "MYR").toUpperCase();
}

export function hitPayPaymentMethods(): string[] {
  const raw =
    process.env.HITPAY_PAYMENT_METHODS?.trim() ||
    "grabpay_direct,shopee_pay,atome";
  return raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

export function appPublicUrl(): string {
  const url = process.env.APP_URL?.trim() || "http://127.0.0.1:43127";
  return url.replace(/\/$/, "");
}

export function normalizeGatewaySetting(value: string | null | undefined): GatewayId {
  const v = (value ?? "stripe").trim().toLowerCase();
  if (v === "hitpay" || v === "mock" || v === "stripe") return v;
  return "stripe";
}

/**
 * Resolve primary gateway from Admin setting + available keys.
 * Missing keys fall back to mock.
 */
export function resolvePrimaryGateway(setting: string | null | undefined): GatewayId {
  const preferred = normalizeGatewaySetting(setting);
  if (preferred === "stripe" && hasStripeKeys()) return "stripe";
  if (preferred === "hitpay" && hasHitPayKeys()) return "hitpay";
  if (preferred === "mock") return "mock";
  // Preferred gateway missing keys → mock
  return "mock";
}

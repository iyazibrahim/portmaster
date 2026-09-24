/** HitPay env helpers — sandbox MYR defaults; production flips methods to fpx,duitnow. */

export function isHitPayEnabled(): boolean {
  return Boolean(process.env.HITPAY_API_KEY?.trim());
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

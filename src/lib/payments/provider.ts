/**
 * Payment providers: mock | stripe | hitpay.
 * Primary gateway comes from Admin `payment_gateway` + env keys.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { createHitPayPaymentRequest } from "@/lib/payments/hitpay";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import {
  type GatewayId,
  hasHitPayKeys,
  hasStripeKeys,
  resolvePrimaryGateway,
} from "@/lib/payments/config";

export type PaymentIntent = {
  id: string;
  amountCents: number;
  currency: "MYR";
  reference: string;
  status: "PENDING" | "PAID" | "FAILED";
  checkoutUrl?: string | null;
};

export interface PaymentProvider {
  readonly name: GatewayId;
  createIntent(input: {
    amountCents: number;
    reference: string;
    passId: string;
    email?: string | null;
    name?: string | null;
  }): Promise<PaymentIntent>;
  confirmMockSuccess(intentId: string): Promise<PaymentIntent>;
  confirmMockFailure(intentId: string): Promise<PaymentIntent>;
}

const store = new Map<string, PaymentIntent>();

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",
  async createIntent({ amountCents, reference }) {
    const intent: PaymentIntent = {
      id: `mock_${reference}`,
      amountCents,
      currency: "MYR",
      reference,
      status: "PENDING",
      checkoutUrl: null,
    };
    store.set(intent.id, intent);
    return intent;
  },
  async confirmMockSuccess(intentId) {
    const existing = store.get(intentId) ?? {
      id: intentId,
      amountCents: 0,
      currency: "MYR" as const,
      reference: intentId.replace(/^mock_/, ""),
      status: "PENDING" as const,
      checkoutUrl: null,
    };
    const updated: PaymentIntent = { ...existing, status: "PAID" };
    store.set(intentId, updated);
    return updated;
  },
  async confirmMockFailure(intentId) {
    const existing = store.get(intentId) ?? {
      id: intentId,
      amountCents: 0,
      currency: "MYR" as const,
      reference: intentId.replace(/^mock_/, ""),
      status: "PENDING" as const,
      checkoutUrl: null,
    };
    const updated: PaymentIntent = { ...existing, status: "FAILED" };
    store.set(intentId, updated);
    return updated;
  },
};

export const hitpayPaymentProvider: PaymentProvider = {
  name: "hitpay",
  async createIntent({ amountCents, reference, passId, email, name }) {
    const req = await createHitPayPaymentRequest({
      amountCents,
      reference,
      passId,
      email,
      name,
    });
    return {
      id: req.id,
      amountCents,
      currency: "MYR",
      reference,
      status: "PENDING",
      checkoutUrl: req.url,
    };
  },
  async confirmMockSuccess() {
    throw new Error("Mock confirm is not available for HitPay.");
  },
  async confirmMockFailure() {
    throw new Error("Mock confirm is not available for HitPay.");
  },
};

export const stripePaymentProvider: PaymentProvider = {
  name: "stripe",
  async createIntent({ amountCents, reference, passId, email, name }) {
    const session = await createStripeCheckoutSession({
      amountCents,
      reference,
      passId,
      email,
      name,
    });
    return {
      id: session.id,
      amountCents,
      currency: "MYR",
      reference,
      status: "PENDING",
      checkoutUrl: session.url,
    };
  },
  async confirmMockSuccess() {
    throw new Error("Mock confirm is not available for Stripe.");
  },
  async confirmMockFailure() {
    throw new Error("Mock confirm is not available for Stripe.");
  },
};

export async function getConfiguredGatewaySetting(): Promise<string> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "payment_gateway"))
    .limit(1);
  return row?.value ?? "stripe";
}

export async function getActiveGateway(): Promise<GatewayId> {
  const setting = await getConfiguredGatewaySetting();
  return resolvePrimaryGateway(setting);
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const gateway = await getActiveGateway();
  if (gateway === "stripe") return stripePaymentProvider;
  if (gateway === "hitpay") return hitpayPaymentProvider;
  return mockPaymentProvider;
}

/** Sync snapshot for Admin UI (keys present?). */
export function getGatewayKeyStatus() {
  return {
    stripeConfigured: hasStripeKeys(),
    hitpayConfigured: hasHitPayKeys(),
  };
}

export { hasHitPayKeys, hasStripeKeys, type GatewayId };

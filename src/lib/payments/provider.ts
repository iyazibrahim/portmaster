/**
 * Payment provider — mock locally; HitPay when HITPAY_API_KEY is set.
 */

import { createHitPayPaymentRequest } from "@/lib/payments/hitpay";
import { isHitPayEnabled } from "@/lib/payments/config";

export type PaymentIntent = {
  id: string;
  amountCents: number;
  currency: "MYR";
  reference: string;
  status: "PENDING" | "PAID" | "FAILED";
  checkoutUrl?: string | null;
};

export interface PaymentProvider {
  readonly name: string;
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

export function getPaymentProvider(): PaymentProvider {
  return isHitPayEnabled() ? hitpayPaymentProvider : mockPaymentProvider;
}

export { isHitPayEnabled };

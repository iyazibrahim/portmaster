/**
 * Payment provider interface — mock only in MVP1.
 * Real FPX/e-wallet gateway to be chosen in a later workshop.
 */

export type PaymentIntent = {
  id: string;
  amountCents: number;
  currency: "MYR";
  reference: string;
  status: "PENDING" | "PAID" | "FAILED";
};

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: {
    amountCents: number;
    reference: string;
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
    };
    store.set(intent.id, intent);
    return intent;
  },
  async confirmMockSuccess(intentId) {
    const existing = store.get(intentId);
    if (!existing) {
      throw new Error("Payment intent not found.");
    }
    const updated: PaymentIntent = { ...existing, status: "PAID" };
    store.set(intentId, updated);
    return updated;
  },
  async confirmMockFailure(intentId) {
    const existing = store.get(intentId);
    if (!existing) {
      throw new Error("Payment intent not found.");
    }
    const updated: PaymentIntent = { ...existing, status: "FAILED" };
    store.set(intentId, updated);
    return updated;
  },
};

export function getPaymentProvider(): PaymentProvider {
  return mockPaymentProvider;
}

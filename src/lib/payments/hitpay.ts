import {
  appPublicUrl,
  hitPayApiKey,
  hitPayApiUrl,
  hitPayCurrency,
  hitPayPaymentMethods,
} from "@/lib/payments/config";

export type HitPayPaymentRequest = {
  id: string;
  url: string;
  status: string;
  reference_number?: string | null;
  amount?: string;
  currency?: string;
};

export async function createHitPayPaymentRequest(input: {
  amountCents: number;
  reference: string;
  passId: string;
  email?: string | null;
  name?: string | null;
}): Promise<HitPayPaymentRequest> {
  const amount = (input.amountCents / 100).toFixed(2);
  const redirectUrl = `${appPublicUrl()}/pass/${input.passId}/paid`;
  const methods = hitPayPaymentMethods();

  const body = new URLSearchParams();
  body.set("amount", amount);
  body.set("currency", hitPayCurrency());
  body.set("reference_number", input.reference);
  body.set("redirect_url", redirectUrl);
  body.set("purpose", `TiangPass ${input.reference}`);
  if (input.email) body.set("email", input.email);
  if (input.name) body.set("name", input.name);
  for (const method of methods) {
    body.append("payment_methods[]", method);
  }

  const res = await fetch(`${hitPayApiUrl()}/v1/payment-requests`, {
    method: "POST",
    headers: {
      "X-BUSINESS-API-KEY": hitPayApiKey(),
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
  });

  const text = await res.text();
  let data: HitPayPaymentRequest & { message?: string };
  try {
    data = JSON.parse(text) as HitPayPaymentRequest & { message?: string };
  } catch {
    throw new Error(
      `HitPay create payment failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  if (!res.ok || !data.id || !data.url) {
    throw new Error(
      data.message ||
        `HitPay create payment failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  return {
    id: data.id,
    url: data.url,
    status: data.status,
    reference_number: data.reference_number,
    amount: data.amount,
    currency: data.currency,
  };
}

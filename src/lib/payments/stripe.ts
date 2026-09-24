import Stripe from "stripe";
import {
  appPublicUrl,
  stripeSecretKey,
} from "@/lib/payments/config";

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey(), {
      apiVersion: "2026-08-26.dahlia",
      typescript: true,
    });
  }
  return client;
}

export async function createStripeCheckoutSession(input: {
  amountCents: number;
  reference: string;
  passId: string;
  email?: string | null;
  name?: string | null;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripeClient();
  const successUrl = `${appPublicUrl()}/pass/${input.passId}/paid?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appPublicUrl()}/pass/${input.passId}/paid?status=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: input.email || undefined,
    client_reference_id: input.passId,
    metadata: {
      passId: input.passId,
      reference: input.reference,
      anglerName: input.name ?? "",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "myr",
          unit_amount: input.amountCents,
          product_data: {
            name: `TiangPass ${input.reference}`,
            description: "Association fishing pass (same-day)",
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a URL.");
  }

  return { id: session.id, url: session.url };
}

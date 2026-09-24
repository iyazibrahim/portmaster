import { NextResponse } from "next/server";
import { hasStripeKeys, stripeWebhookSecret } from "@/lib/payments/config";
import { getStripeClient } from "@/lib/payments/stripe";
import { fulfillPassPayment } from "@/lib/pass";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasStripeKeys()) {
    return NextResponse.json({ ok: false, error: "Stripe disabled" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret(),
    );
  } catch (e) {
    console.error("[stripe webhook] signature", e);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      client_reference_id?: string | null;
      metadata?: { passId?: string; reference?: string };
      payment_status?: string;
    };

    if (session.payment_status && session.payment_status !== "paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    try {
      await fulfillPassPayment({
        providerRef: session.id,
        passId: session.client_reference_id || session.metadata?.passId || null,
        referenceNumber: session.metadata?.reference ?? null,
      });
    } catch (e) {
      console.error("[stripe webhook] fulfill", e);
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : "Fulfillment failed",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

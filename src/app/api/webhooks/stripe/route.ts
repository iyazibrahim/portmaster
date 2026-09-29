import { NextResponse } from "next/server";
import { hasStripeKeys, stripeWebhookSecret } from "@/lib/payments/config";
import { getStripeClient } from "@/lib/payments/stripe";
import { fulfillPassPayment } from "@/lib/pass";
import { reportPaymentFailure } from "@/lib/payment-failure-notify";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const FULFILL_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(request: Request) {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit({
    key: `stripe-webhook:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

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

  if (!FULFILL_EVENTS.has(event.type)) {
    // Common misconfig: destination listens to payment_intent.succeeded only.
    // We ack 200 so Stripe doesn't retry, but pass stays pending until return-path confirm.
    console.warn("[stripe webhook] ignored event type", event.type);
    return NextResponse.json({
      ok: true,
      ignored: true,
      event: event.type,
      hint: "Subscribe to checkout.session.completed",
    });
  }

  const session = event.data.object as {
    id: string;
    client_reference_id?: string | null;
    metadata?: { passId?: string; reference?: string };
    payment_status?: string;
  };

  if (
    session.payment_status &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      payment_status: session.payment_status,
    });
  }

  const passId = session.client_reference_id || session.metadata?.passId || null;
  const reference = session.metadata?.reference ?? passId ?? session.id;

  try {
    await fulfillPassPayment({
      providerRef: session.id,
      passId,
      referenceNumber: session.metadata?.reference ?? null,
    });
    return NextResponse.json({ ok: true, fulfilled: true, event: event.type });
  } catch (e) {
    console.error("[stripe webhook] fulfill", e);
    if (passId) {
      await reportPaymentFailure({
        passId,
        reference,
        description: `Stripe checkout fulfillment failed for session ${session.id}.`,
      }).catch((err) => console.error("[stripe webhook] notify", err));
    }
    return NextResponse.json(
      { ok: false, error: "Fulfillment failed" },
      { status: 500 },
    );
  }
}

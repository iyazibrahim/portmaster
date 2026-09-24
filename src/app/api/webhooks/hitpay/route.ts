import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { hasHitPayKeys, hitPayWebhookSalt } from "@/lib/payments/config";
import { fulfillHitPayPayment } from "@/lib/pass";

export const runtime = "nodejs";

function verifyHitPaySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const salt = hitPayWebhookSalt();
  const computed = createHmac("sha256", salt).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type HitPayWebhookBody = {
  id?: string;
  status?: string;
  reference_number?: string | null;
};

export async function POST(request: Request) {
  if (!hasHitPayKeys()) {
    return NextResponse.json({ ok: false, error: "HitPay disabled" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("hitpay-signature");

  if (!verifyHitPaySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: HitPayWebhookBody;
  try {
    payload = JSON.parse(rawBody) as HitPayWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const status = (payload.status ?? "").toLowerCase();
  const eventType = (
    request.headers.get("hitpay-event-type") ?? ""
  ).toLowerCase();

  if (!payload.id || (status !== "completed" && eventType !== "completed")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await fulfillHitPayPayment({
      paymentRequestId: payload.id,
      referenceNumber: payload.reference_number,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[hitpay webhook]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Fulfillment failed",
      },
      { status: 500 },
    );
  }
}

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasHitPayKeys, hitPayWebhookSalt } from "@/lib/payments/config";
import { fulfillHitPayPayment } from "@/lib/pass";
import { reportPaymentFailure } from "@/lib/payment-failure-notify";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { passes, payments } from "@/db/schema";
import { eq } from "drizzle-orm";

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

const hitPayWebhookSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  status: z.string().max(64).optional(),
  reference_number: z.string().max(128).nullable().optional(),
});

export async function POST(request: Request) {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit({
    key: `hitpay-webhook:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  if (!hasHitPayKeys()) {
    return NextResponse.json({ ok: false, error: "HitPay disabled" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("hitpay-signature");

  if (!verifyHitPaySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: z.infer<typeof hitPayWebhookSchema>;
  try {
    payload = hitPayWebhookSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
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
    let passId: string | null = null;
    let reference = payload.reference_number ?? payload.id;
    if (payload.reference_number) {
      const [pass] = await db
        .select({ id: passes.id, reference: passes.reference })
        .from(passes)
        .where(eq(passes.reference, payload.reference_number))
        .limit(1);
      if (pass) {
        passId = pass.id;
        reference = pass.reference;
      }
    }
    if (!passId) {
      const [byRef] = await db
        .select({ passId: payments.passId })
        .from(payments)
        .where(eq(payments.mockRef, payload.id))
        .limit(1);
      passId = byRef?.passId ?? null;
    }
    if (passId) {
      await reportPaymentFailure({
        passId,
        reference,
        description: `HitPay payment fulfillment failed for request ${payload.id}.`,
      }).catch((err) => console.error("[hitpay webhook] notify", err));
    }
    return NextResponse.json(
      { ok: false, error: "Fulfillment failed" },
      { status: 500 },
    );
  }
}

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { alerts, settings } from "@/db/schema";
import { sendMail } from "@/lib/mail";
import { id } from "@/lib/utils-app";

async function hasOpenPaymentFailedAlert(passId: string) {
  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.type, "PAYMENT_FAILED"),
        isNull(alerts.resolvedAt),
        eq(alerts.passId, passId),
      ),
    )
    .limit(1);
  return Boolean(existing);
}

async function receiptEmail(): Promise<string | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "receipt_email"))
    .limit(1);
  const email = row?.value?.trim() ?? "";
  if (!email || email.toLowerCase().endsWith(".local")) return null;
  return email;
}

/**
 * One open PAYMENT_FAILED alert per pass, and at most one ops email when the alert is created.
 * Safe to call from webhooks and from refreshOpsAlerts.
 */
export async function reportPaymentFailure(input: {
  passId: string;
  reference: string;
  description: string;
}): Promise<{ alertCreated: boolean; emailed: boolean }> {
  if (await hasOpenPaymentFailedAlert(input.passId)) {
    return { alertCreated: false, emailed: false };
  }

  await db.insert(alerts).values({
    id: id("alt"),
    type: "PAYMENT_FAILED",
    severity: "CRITICAL",
    title: `Payment failed · ${input.reference}`,
    description: input.description,
    passId: input.passId,
  });

  const to = await receiptEmail();
  if (!to) {
    console.error(
      "[payment-failure] alert created; no live receipt_email for ops mail",
      input.reference,
    );
    return { alertCreated: true, emailed: false };
  }

  const sent = await sendMail({
    to,
    subject: `[TiangPass] Payment failed · ${input.reference}`,
    text: [
      "A fishing pass payment needs attention.",
      "",
      `Reference: ${input.reference}`,
      `Pass id: ${input.passId}`,
      "",
      input.description,
      "",
      "Open Admin → Alerts in TiangPass for details.",
    ].join("\n"),
  });

  if (!sent.ok) {
    console.error("[payment-failure] email failed", sent.error, input.reference);
    return { alertCreated: true, emailed: false };
  }

  return { alertCreated: true, emailed: true };
}

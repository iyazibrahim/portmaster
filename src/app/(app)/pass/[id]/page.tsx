import { eq } from "drizzle-orm";
import { QRCodeSVG } from "qrcode.react";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { jetties, locations, payments, passes, settings } from "@/db/schema";
import { getActiveQrToken } from "@/lib/pass";
import { shouldRemindSelfCheckOut } from "@/domain/pass";
import { StatusBadge } from "@/components/status-badge";
import {
  DEFAULT_OVERDUE_HOURS,
  formatEnumLabel,
  formatMYR,
} from "@/lib/utils-app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadReceiptButton } from "@/components/pass/download-receipt-button";
import { PassWalletCache } from "@/components/pass/pass-wallet-cache";
import {
  OvernightIntentionPanel,
  SelfCheckoutPanel,
} from "@/components/pass/self-checkout-panel";
import { CancelPassActions } from "@/components/pass/cancel-pass-actions";
import { getTranslator } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function PassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { t } = await getTranslator();
  const { id } = await params;

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, id))
    .limit(1);
  if (!pass || pass.userId !== session.user.id) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 lg:max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pass.notFound")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pass.notFoundHint")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/trips"
            className={cn(
              buttonVariants(),
              "inline-flex min-h-11 w-full sm:w-auto",
            )}
          >
            My passes
          </Link>
          <Link
            href="/pass"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex min-h-11 w-full sm:w-auto",
            )}
          >
            Buy a pass
          </Link>
        </div>
      </div>
    );
  }

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, pass.jettyId))
    .limit(1);
  const [pillar] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, pass.pillarId))
    .limit(1);
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.passId, pass.id))
    .limit(1);

  const [overdueSetting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "overdue_hours"))
    .limit(1);
  const overdueHours = Number(overdueSetting?.value);
  const remind = shouldRemindSelfCheckOut({
    status: pass.status,
    expectedReturnOn: pass.expectedReturnOn,
    checkedInAt: pass.checkedInAt,
    overdueHours: Number.isFinite(overdueHours)
      ? overdueHours
      : DEFAULT_OVERDUE_HOURS,
  });

  const qr = await getActiveQrToken(pass.id);
  const paymentLabel = payment
    ? `${formatEnumLabel(payment.status)}${payment.mockRef ? ` · ${payment.mockRef}` : ""}`
    : "—";

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 lg:max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pass.detailTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{pass.reference}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 sm:px-5 sm:pt-5">
          <CardTitle className="text-base">{t("pass.status")}</CardTitle>
          <StatusBadge status={pass.status} />
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {qr &&
          (pass.status === "ACTIVE" || pass.status === "CHECKED_IN") ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-4 sm:p-5">
              <div className="w-full max-w-[220px]">
                <QRCodeSVG
                  value={qr.token}
                  size={220}
                  level="M"
                  className="h-auto w-full"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {t("pass.qrHint", { date: pass.validOn })}
              </p>
              <code className="max-w-full break-all text-center text-[10px] leading-relaxed text-muted-foreground">
                {qr.token}
              </code>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("pass.qrAfterPay")}
            </p>
          )}

          <PassWalletCache
            passId={pass.id}
            reference={pass.reference}
            status={pass.status}
            validOn={pass.validOn}
            jettyName={jetty?.name ?? "—"}
            pillarName={pillar?.name ?? "—"}
            qrToken={qr?.token ?? null}
            feeCents={pass.feeCents}
          />

          <SelfCheckoutPanel
            passId={pass.id}
            status={pass.status}
            expectedReturnOn={pass.expectedReturnOn}
            remind={remind}
          />

          <OvernightIntentionPanel
            passId={pass.id}
            status={pass.status}
            validOn={pass.validOn}
            intendsOvernight={pass.intendsOvernight}
            expectedReturnOn={pass.expectedReturnOn}
          />

          <dl className="grid gap-0 text-sm">
            <Row label={t("pass.jetty")} value={jetty?.name ?? "—"} />
            <Row label={t("pass.pillar")} value={pillar?.name ?? "—"} />
            <Row label={t("pass.boat")} value={t("pass.boatHint")} />
            <Row label={t("pass.fee")} value={formatMYR(pass.feeCents)} />
            <Row label={t("pass.payment")} value={paymentLabel} />
            {pass.intendsOvernight && pass.expectedReturnOn ? (
              <Row
                label={t("pass.overnight.returnDate")}
                value={pass.expectedReturnOn}
              />
            ) : null}
          </dl>

          {payment?.status === "PAID" ? (
            <DownloadReceiptButton passId={pass.id} />
          ) : null}

          <CancelPassActions
            passId={pass.id}
            status={pass.status}
            pillarName={pillar?.name}
          />
        </CardContent>
      </Card>

      <Link
        href="/pass"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "inline-flex min-h-11 w-full sm:w-auto",
        )}
      >
        {t("pass.backBuy")}
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

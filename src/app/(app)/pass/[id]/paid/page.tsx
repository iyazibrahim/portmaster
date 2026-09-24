import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { passes } from "@/db/schema";
import { SoftLiveRefresh } from "@/components/soft-live-refresh";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTranslator } from "@/i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isReservationExpired } from "@/domain/pass";
import { confirmStripeCheckoutReturn } from "@/lib/pass";
import { hasStripeKeys } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

export default async function PassPaidPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    reference?: string;
    session_id?: string;
  }>;
}) {
  const session = await requireSession();
  const { t } = await getTranslator();
  const { id } = await params;
  const qs = await searchParams;

  let [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, id))
    .limit(1);

  if (!pass || pass.userId !== session.user.id) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pass.notFound")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pass.notFoundHint")}</p>
        <Link href="/pass" className={cn(buttonVariants())}>
          {t("pass.buy")}
        </Link>
      </div>
    );
  }

  // Stripe success_url includes session_id — confirm via API if webhook lagged/missing.
  if (
    qs.session_id &&
    hasStripeKeys() &&
    pass.status === "PENDING_PAYMENT"
  ) {
    try {
      await confirmStripeCheckoutReturn({
        sessionId: qs.session_id,
        passId: pass.id,
        userId: session.user.id,
      });
      const [refreshed] = await db
        .select()
        .from(passes)
        .where(eq(passes.id, id))
        .limit(1);
      if (refreshed) pass = refreshed;
    } catch (e) {
      console.error("[stripe return confirm]", e);
    }
  }

  if (pass.status === "ACTIVE" || pass.status === "CHECKED_IN") {
    redirect(`/pass/${pass.id}`);
  }

  const returnStatus = (qs.status ?? "").toLowerCase();
  const expired = isReservationExpired(pass.reservedUntil);
  const cancelled =
    returnStatus === "failed" ||
    returnStatus === "canceled" ||
    returnStatus === "cancelled";
  const pending =
    pass.status === "PENDING_PAYMENT" && !expired && !cancelled;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      {pending ? <SoftLiveRefresh intervalMs={4_000} /> : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pass.paid.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("pass.paid.ref", { reference: pass.reference })}
        </p>
      </div>

      {expired ? (
        <Alert variant="destructive">
          <AlertTitle>{t("pass.paid.expiredTitle")}</AlertTitle>
          <AlertDescription>{t("pass.paid.expiredBody")}</AlertDescription>
        </Alert>
      ) : cancelled ? (
        <Alert variant="destructive">
          <AlertTitle>{t("pass.paid.failedTitle")}</AlertTitle>
          <AlertDescription>{t("pass.paid.failedBody")}</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>{t("pass.paid.confirmingTitle")}</AlertTitle>
          <AlertDescription>{t("pass.paid.confirmingBody")}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/pass/${pass.id}`}
          className={cn(buttonVariants(), "min-h-11")}
        >
          {t("pass.paid.viewPass")}
        </Link>
        <Link
          href="/pass"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {t("pass.buy")}
        </Link>
      </div>
    </div>
  );
}

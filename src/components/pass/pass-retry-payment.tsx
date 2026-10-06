"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  actionMockPaySuccess,
  actionStartGatewayCheckout,
} from "@/lib/actions/pass";
import type { GatewayId } from "@/lib/payments/config";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BusyLabel } from "@/components/ux/action-spinner";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function PassRetryPayment({
  passId,
  expired,
  gateway,
}: {
  passId: string;
  expired: boolean;
  gateway: GatewayId;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (expired) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("pass.paid.expiredTitle")}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{t("pass.retryExpired")}</span>
          <Link
            href="/pass"
            className={cn(buttonVariants(), "min-h-11 w-fit")}
          >
            {t("pass.buy")}
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  function retry() {
    startTransition(async () => {
      if (gateway === "mock") {
        const result = await actionMockPaySuccess(passId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        router.push(`/pass/${passId}`);
        router.refresh();
        return;
      }
      const result = await actionStartGatewayCheckout(passId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.checkoutUrl) {
        toast.error(t("pass.pay.checkoutMissingUrl"));
        return;
      }
      window.location.assign(result.checkoutUrl);
    });
  }

  const label =
    gateway === "stripe"
      ? t("pass.pay.stripeCta")
      : gateway === "hitpay"
        ? t("pass.pay.hitpayCta")
        : t("pass.retryPay");

  return (
    <Button
      type="button"
      className="min-h-11 w-full sm:w-auto"
      disabled={pending}
      onClick={retry}
    >
      <BusyLabel busy={pending} busyText={t("pass.pay.redirecting")}>
        {label}
      </BusyLabel>
    </Button>
  );
}

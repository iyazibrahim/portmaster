"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

export function OfflinePageClient() {
  const { t } = useT();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <BrandLogo size={72} className="h-16 w-16" />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("offline.title")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("offline.body")}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button render={<Link href="/handler/scan" />} className="w-full">
          {t("offline.scanner")}
        </Button>
        <Button
          render={<Link href="/trips" />}
          variant="outline"
          className="w-full"
        >
          {t("offline.myPasses")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          {t("offline.retry")}
        </Button>
      </div>
    </main>
  );
}

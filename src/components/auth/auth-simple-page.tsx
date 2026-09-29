"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

/** Shared header and card for the short auth screens (forgot password, reset password). */
export function AuthSimplePage({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  const { locale } = useT();

  return (
    <main className="relative flex min-h-dvh flex-col overflow-y-auto overscroll-y-contain">
      <MarketingBackground />

      <header className="relative z-10 flex min-h-14 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 py-2 text-sm font-semibold tracking-tight"
        >
          <BrandLogo size={32} className="h-8 w-8 shrink-0" priority />
          TiangPass
        </Link>
        <LocaleSwitcher locale={locale} />
      </header>

      <div
        className={cn(
          "relative z-10 flex flex-1 justify-center px-4 py-8 sm:px-6 lg:px-8",
          centered ? "items-center" : "items-start sm:items-center",
        )}
      >
        <div className="w-full max-w-md rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

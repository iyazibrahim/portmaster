"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordWithTokenAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { KeyboardSafeForm } from "@/components/ux/keyboard-safe-form";
import { PasswordWithStrengthFields } from "@/components/auth/password-with-strength-fields";
import { useT } from "@/i18n/locale-provider";
import {
  getPasswordChecks,
  passwordChecksOk,
} from "@/lib/password-policy";

export function ResetPasswordForm() {
  const { t, locale } = useT();
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const linkMissing = !token;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirmPassword") ?? "");
    if (!passwordChecksOk(getPasswordChecks(password))) {
      setError(t("auth.passwordHint"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    startTransition(async () => {
      const result = await resetPasswordWithTokenAction({
        token,
        newPassword: password,
        confirmPassword: confirm,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/login?reset=1");
    });
  }

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

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {t("auth.resetTitle")}
          </h1>
          <p className="mt-2 text-sm leading-normal text-muted-foreground">
            {t("auth.resetSub")}
          </p>

          {linkMissing ? (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>{t("auth.resetInvalidTitle")}</AlertTitle>
              <AlertDescription>{t("auth.resetInvalidBody")}</AlertDescription>
            </Alert>
          ) : (
            <KeyboardSafeForm onSubmit={onSubmit} className="mt-6 space-y-4">
              <PasswordWithStrengthFields
                passwordLabel={t("auth.newPassword")}
              />

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("auth.resetFailed")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? t("common.loading") : t("auth.resetSubmit")}
              </Button>
            </KeyboardSafeForm>
          )}

          <p className="mt-4 text-sm leading-normal text-muted-foreground">
            <Link
              href="/forgot-password"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("auth.forgotLink")}
            </Link>
            <span className="mx-2 text-border">·</span>
            <Link
              href="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("auth.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

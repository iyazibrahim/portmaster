"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordWithTokenAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyboardSafeForm } from "@/components/ux/keyboard-safe-form";
import { AuthSimplePage } from "@/components/auth/auth-simple-page";
import { PasswordWithStrengthFields } from "@/components/auth/password-with-strength-fields";
import { useT } from "@/i18n/locale-provider";
import {
  getPasswordChecks,
  passwordChecksOk,
} from "@/lib/password-policy";

export function ResetPasswordForm() {
  const { t } = useT();
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
    <AuthSimplePage>
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
          <PasswordWithStrengthFields passwordLabel={t("auth.newPassword")} />

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
    </AuthSimplePage>
  );
}

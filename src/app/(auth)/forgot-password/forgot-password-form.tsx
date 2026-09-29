"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyboardSafeForm } from "@/components/ux/keyboard-safe-form";
import { AuthSimplePage } from "@/components/auth/auth-simple-page";
import { useT } from "@/i18n/locale-provider";

export function ForgotPasswordForm() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      await requestPasswordResetAction(email);
      setDone(true);
    });
  }

  return (
    <AuthSimplePage centered>
      <h1 className="text-xl font-semibold tracking-tight">
        {t("auth.forgotTitle")}
      </h1>
      <p className="mt-2 text-sm leading-normal text-muted-foreground">
        {t("auth.forgotSub")}
      </p>

      {done ? (
        <Alert className="mt-6">
          <AlertTitle>{t("auth.forgotSentTitle")}</AlertTitle>
          <AlertDescription>{t("auth.forgotSentBody")}</AlertDescription>
        </Alert>
      ) : (
        <KeyboardSafeForm onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("common.loading") : t("auth.forgotSubmit")}
          </Button>
        </KeyboardSafeForm>
      )}

      <p className="mt-4 text-sm leading-normal text-muted-foreground">
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

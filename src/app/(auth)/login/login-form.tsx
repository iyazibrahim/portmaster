"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginWithCredentials } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { KeyboardSafeForm } from "@/components/ux/keyboard-safe-form";
import { BusyLabel } from "@/components/ux/action-spinner";
import { classifyError, uxErrorKeys } from "@/lib/ux/map-error";
import { useT } from "@/i18n/locale-provider";

const DEMO_LOGINS = [
  { email: "admin@tiangpass.local", label: "Admin" },
  { email: "fisher@tiangpass.local", label: "Angler" },
  { email: "handler@tiangpass.local", label: "Operator" },
] as const;

export function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "";
  const resetOk = search.get("reset") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { t, locale } = useT();

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await loginWithCredentials(email, password, next);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        window.location.assign(result.redirectTo);
      } catch (err) {
        const kind = classifyError(err);
        const keys = uxErrorKeys(kind);
        setError(`${t(keys.title)} — ${t(keys.body)}`);
      }
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <LocaleSwitcher locale={locale} />
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            {t("auth.signupLink")}
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-8">
          <BrandLogo
            size={96}
            className="h-20 w-20 sm:h-24 sm:w-24 lg:hidden"
            priority
          />
          <div className="hidden space-y-4 lg:block">
            <div className="flex items-center gap-4">
              <BrandLogo size={64} className="h-16 w-16" />
              <p className="font-display text-3xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]">
                TiangPass
              </p>
            </div>
            <p className="max-w-sm text-base leading-normal text-muted-foreground">
              {t("auth.loginSub")}
            </p>
            <FishingScene className="max-w-md" />
          </div>

          <div className="w-full rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="mb-6 space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {t("auth.loginTitle")}
              </h1>
              <p className="text-sm leading-normal text-muted-foreground">
                {t("auth.loginSub")}
              </p>
            </div>

            <KeyboardSafeForm onSubmit={onSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  required
                  placeholder="fisher@tiangpass.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {resetOk ? (
                <Alert>
                  <AlertTitle>{t("auth.resetSuccessTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("auth.resetSuccessBody")}
                  </AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("auth.loginFailed")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={pending}>
                <BusyLabel busy={pending} busyText={t("common.loading")}>
                  {t("auth.submitLogin")}
                </BusyLabel>
              </Button>
            </KeyboardSafeForm>

            <p className="mt-4 text-sm leading-normal text-muted-foreground">
              <Link
                href="/forgot-password"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("auth.forgotLink")}
              </Link>
            </p>

            <p className="mt-2 text-sm leading-normal text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link
                href="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("auth.signupLink")}
              </Link>
            </p>

            <div className="mt-6 border-t border-border pt-4 text-xs leading-normal text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Demo logins</p>
              <p className="mb-2">Password for all: password123</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_LOGINS.map((demo) => (
                  <Button
                    key={demo.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 font-mono text-xs"
                    onClick={() => fillDemo(demo.email)}
                  >
                    {demo.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

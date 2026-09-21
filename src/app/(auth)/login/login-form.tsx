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

const DEMO_LOGINS = [
  { email: "admin@tiangpass.local", label: "Admin" },
  { email: "fisher@tiangpass.local", label: "Angler" },
  { email: "handler@tiangpass.local", label: "Operator" },
] as const;

export function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await loginWithCredentials(email, password, next);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <MarketingBackground />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BrandLogo size={32} className="h-8 w-8" priority />
          TiangPass
        </Link>
        <Link
          href="/signup"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Create account
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <FishingScene className="max-w-[220px] lg:hidden" />
          <div className="hidden space-y-4 lg:block">
            <div className="flex items-center gap-3">
              <BrandLogo size={64} className="h-16 w-16" />
              <p
                className="font-display text-4xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]"
              >
                TiangPass
              </p>
            </div>
            <p className="max-w-sm text-muted-foreground">
              Sign in to book Penang jetty trips, manage boarding QR, or run
              ops.
            </p>
            <FishingScene className="max-w-md" />
          </div>

          <div className="w-full rounded-xl border border-border/80 bg-background/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="mb-6 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                Anglers, boatmen, and admins.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  required
                  className="min-h-11"
                  placeholder="fisher@tiangpass.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="min-h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="min-h-11 w-full"
                disabled={pending}
              >
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
              New angler?{" "}
              <Link
                href="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Boat operators are registered by Association Admin — there is no
              operator self-signup. Use the account you were given to sign in.
            </p>

            <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Demo logins</p>
              <p className="mb-2">Password for all: password123</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_LOGINS.map((demo) => (
                  <Button
                    key={demo.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-mono text-[11px]"
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

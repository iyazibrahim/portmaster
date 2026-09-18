"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import { loginWithCredentials } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";
import { cn } from "@/lib/utils";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-landing",
  display: "swap",
});

export function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    startTransition(async () => {
      const result = await loginWithCredentials(email, password, next);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <main
      className={cn(
        newsreader.variable,
        "relative flex min-h-dvh flex-col overflow-hidden",
      )}
    >
      <MarketingBackground />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PortMaster
        </Link>
        <Link
          href="/signup"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Create account
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="hidden space-y-4 lg:block">
            <p
              className="font-[family-name:var(--font-display-landing)] text-4xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]"
            >
              PortMaster
            </p>
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
                  type="email"
                  autoComplete="email"
                  required
                  className="min-h-11"
                  placeholder="fisher@portmaster.local"
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

            <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Demo</p>
              <ul className="grid gap-1 font-mono text-[11px] sm:grid-cols-2">
                <li>fisher@portmaster.local</li>
                <li>handler@portmaster.local</li>
                <li>admin@portmaster.local</li>
                <li>password123</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

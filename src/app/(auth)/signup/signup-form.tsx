"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import { signUpAngler, loginWithCredentials } from "@/lib/actions/auth";
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

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      emergencyContact: String(fd.get("emergencyContact") ?? ""),
      password: String(fd.get("password") ?? ""),
      acceptPolicy: fd.get("acceptPolicy") === "on",
    };

    startTransition(async () => {
      const result = await signUpAngler(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await loginWithCredentials(payload.email, payload.password);
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
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-5xl items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="hidden space-y-4 pt-4 lg:block">
            <p
              className="font-[family-name:var(--font-display-landing)] text-4xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]"
            >
              PortMaster
            </p>
            <p className="max-w-sm text-muted-foreground">
              Create an angler account to book jetty spots and receive boarding
              QR passes.
            </p>
            <FishingScene className="max-w-md" />
          </div>

          <div className="w-full rounded-xl border border-border/80 bg-background/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="mb-6 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Angler sign up
              </h1>
              <p className="text-sm text-muted-foreground">
                For booking fishing trips at Penang jetties.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Full name" required />
                <Field id="email" label="Email" type="email" required />
                <Field id="phone" label="Phone" type="tel" required />
                <Field
                  id="emergencyContact"
                  label="Emergency contact"
                  required
                />
              </div>
              <Field
                id="password"
                label="Password"
                type="password"
                required
                autoComplete="new-password"
              />
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptPolicy"
                  className="mt-1 size-4 accent-[var(--primary)]"
                  required
                />
                <span>
                  I agree to the{" "}
                  <Link
                    href="/policy"
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/consent"
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    Consent
                  </Link>{" "}
                  terms.
                </span>
              </label>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign up failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="min-h-11 w-full"
                disabled={pending}
              >
                {pending ? "Creating…" : "Create account"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="min-h-11"
      />
    </div>
  );
}

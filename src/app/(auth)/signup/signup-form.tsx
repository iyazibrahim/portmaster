"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpAngler, loginWithCredentials } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SignUpForm() {
  const router = useRouter();
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
      const login = await loginWithCredentials(payload.email, payload.password);
      if (!login.ok) {
        router.push("/login");
        return;
      }
      router.push("/book");
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PortMaster
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Angler sign up
            </h1>
            <p className="text-sm text-muted-foreground">
              Create an account to book bridge locations and receive boarding
              QR passes.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field id="name" label="Full name" required />
            <Field id="email" label="Email" type="email" required />
            <Field id="phone" label="Phone" type="tel" required />
            <Field
              id="emergencyContact"
              label="Emergency contact"
              required
            />
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

            <Button type="submit" className="min-h-11 w-full" disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
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

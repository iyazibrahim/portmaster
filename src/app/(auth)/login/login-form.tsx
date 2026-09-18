"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginWithCredentials } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function LoginForm() {
  const router = useRouter();
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
      const result = await loginWithCredentials(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      let dest = next;
      if (!dest) {
        if (result.role === "ADMIN") dest = "/admin/ops";
        else if (result.role === "HANDLER") dest = "/handler";
        else dest = "/book";
      }
      router.push(dest);
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center border-b border-border px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PortMaster
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Book trips, scan boarding passes, or run ops.
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

            <Button type="submit" className="min-h-11 w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            New angler?{" "}
            <Link
              href="/signup"
              className="text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Demo accounts</p>
            <ul className="space-y-1 font-mono text-[11px]">
              <li>fisher@portmaster.local</li>
              <li>handler@portmaster.local</li>
              <li>admin@portmaster.local</li>
              <li className="pt-1">password123</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

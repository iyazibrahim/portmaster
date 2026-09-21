"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "tiangpass_cookie_consent";

export type CookieConsentChoice = "necessary" | "all";

function readConsent(): CookieConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  const value = match?.split("=")[1];
  if (value === "necessary" || value === "all") return value;
  return null;
}

function writeConsent(choice: CookieConsentChoice) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_KEY}=${choice}; path=/; max-age=${maxAge}; samesite=lax`;
  window.dispatchEvent(new Event("tiangpass-cookie-consent"));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("tiangpass-cookie-consent", onStoreChange);
  return () =>
    window.removeEventListener("tiangpass-cookie-consent", onStoreChange);
}

function getSnapshot() {
  return readConsent();
}

function getServerSnapshot(): CookieConsentChoice | null {
  return null;
}

/** First-visit cookie banner — Necessary always on; Analytics optional. */
export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const visible = consent === null;

  function accept(choice: CookieConsentChoice) {
    writeConsent(choice);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Cookies &amp; privacy</p>
          <p className="text-muted-foreground">
            We use necessary cookies to keep you signed in and remember language
            preference. Optional analytics cookies help improve TiangPass. See
            our{" "}
            <Link
              href="/cookies"
              className="text-primary underline-offset-4 hover:underline"
            >
              Cookies Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/policy"
              className="text-primary underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => accept("necessary")}
          >
            Necessary only
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => accept("all")}
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

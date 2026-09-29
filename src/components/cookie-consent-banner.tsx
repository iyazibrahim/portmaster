"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

const COOKIE_KEY = "tiangpass_cookie_consent";
const STORAGE_KEY = "tiangpass_cookie_consent";

export type CookieConsentChoice = "necessary" | "all";

function parseChoice(value: string | null | undefined): CookieConsentChoice | null {
  if (value === "necessary" || value === "all") return value;
  return null;
}

function readCookieConsent(): CookieConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  return parseChoice(match?.split("=")[1]);
}

function readStorageConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    return parseChoice(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function readConsent(): CookieConsentChoice | null {
  const fromCookie = readCookieConsent();
  if (fromCookie) return fromCookie;
  const fromStorage = readStorageConsent();
  if (fromStorage) {
    writeConsentCookie(fromStorage);
    return fromStorage;
  }
  return null;
}

function writeConsentCookie(choice: CookieConsentChoice) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${COOKIE_KEY}=${choice}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

function writeConsent(choice: CookieConsentChoice) {
  writeConsentCookie(choice);
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event("tiangpass-cookie-consent"));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("tiangpass-cookie-consent", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("tiangpass-cookie-consent", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getServerSnapshot(): CookieConsentChoice | null {
  return "necessary";
}

function getSnapshot(): CookieConsentChoice | null {
  return readConsent();
}

/** First-visit acknowledgement — necessary cookies only (no analytics). */
export function CookieConsentBanner() {
  const { t } = useT();
  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const visible = consent === null;

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[60] px-3 pb-2 lg:bottom-0 lg:px-0 lg:pb-0">
      <div className="mx-auto max-w-3xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur lg:rounded-none lg:border-x-0 lg:border-b-0 lg:border-t">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1 text-sm">
            <p className="font-medium">{t("legal.bannerTitle")}</p>
            <p className="text-muted-foreground">
              {t("legal.bannerBody")}{" "}
              <Link
                href="/cookies"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("legal.linkCookies")}
              </Link>{" "}
              ·{" "}
              <Link
                href="/policy"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("legal.linkPolicy")}
              </Link>
              .
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11 shrink-0"
            onClick={() => writeConsent("necessary")}
          >
            {t("legal.bannerOk")}
          </Button>
        </div>
      </div>
    </div>
  );
}

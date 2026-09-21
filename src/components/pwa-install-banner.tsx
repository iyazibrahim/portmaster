"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

const DISMISS_KEY = "tiangpass_pwa_dismiss";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function subscribeDismiss(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("tiangpass-pwa-dismiss", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("tiangpass-pwa-dismiss", onStoreChange);
  };
}

function getDismissed() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

/** Soft, dismissible install prompt for mobile anglers. */
export function PwaInstallBanner() {
  const isClient = useIsClient();
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    getDismissed,
    () => true,
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (!isClient || dismissed || isStandalone() || !isMobileViewport()) {
      return;
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [isClient, dismissed]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    window.dispatchEvent(new Event("tiangpass-pwa-dismiss"));
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  const visible =
    isClient && !dismissed && !isStandalone() && isMobileViewport();

  if (!visible) return null;

  const iosHint = isIos();

  return (
    <div className="fixed inset-x-0 bottom-[4.25rem] z-50 px-3 lg:hidden">
      <div className="mx-auto flex max-w-lg flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BrandLogo size={40} className="mt-0.5 h-10 w-10 shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">Install TiangPass</p>
            <p className="text-xs text-muted-foreground">
              {iosHint
                ? "On iPhone: Share → Add to Home Screen for quicker boarding."
                : "Add TiangPass to your home screen for faster pass purchase and boarding."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-10"
            onClick={dismiss}
          >
            Not now
          </Button>
          {deferred ? (
            <Button
              type="button"
              size="sm"
              className="min-h-10"
              onClick={() => void install()}
            >
              Install
            </Button>
          ) : iosHint ? (
            <Button
              type="button"
              size="sm"
              className="min-h-10"
              onClick={dismiss}
            >
              Got it
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ScannerPanel } from "@/components/handler/scanner-panel";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Keep ScannerPanel mounted across operator tab hops (Today ↔ Scan ↔ Fleet).
 * Unmounting the camera in a PWA often ends MediaStream tracks; the next
 * getUserMedia then re-prompts. Parking off-screen (not display:none) keeps
 * the stream warm when permission was already granted.
 */
export function PersistentHandlerScanner({
  isAdmin,
  requireJettyGps,
}: {
  isAdmin: boolean;
  requireJettyGps: boolean;
}) {
  const pathname = usePathname();
  const { t } = useT();
  const ready = useIsClient();
  const onScan =
    pathname === "/handler/scan" || pathname.startsWith("/handler/scan/");

  return (
    <div
      className={cn(
        onScan
          ? "mx-auto w-full max-w-lg space-y-6 lg:max-w-xl"
          : // Stay in the tree & paintable — display:none / unmount kills tracks on iOS PWA.
            "pointer-events-none fixed bottom-0 right-0 z-[-1] h-px w-px overflow-hidden opacity-0",
      )}
      aria-hidden={!onScan}
    >
      {onScan ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("scan.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("scan.subtitle")}</p>
        </div>
      ) : null}
      {ready ? (
        <ScannerPanel
          isAdmin={isAdmin}
          requireJettyGps={requireJettyGps}
          active={onScan}
        />
      ) : null}
    </div>
  );
}

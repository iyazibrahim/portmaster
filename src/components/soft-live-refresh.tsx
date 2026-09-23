"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { subscribeBoardingUpdated } from "@/lib/boarding-client";

/**
 * Soft-poll router.refresh while the tab is visible so status boards
 * (ops / passes / handler today / pass detail) pick up CI/CO without a
 * manual reload. Also refreshes immediately when a scan completes in
 * this browser (CustomEvent / BroadcastChannel).
 *
 * Avoid mounting this on /handler/scan — refresh there remounts the camera.
 *
 * Memory note: each refresh re-runs RSC + DB work. Use a long interval and
 * skip overlapping refreshes so small VPS hosts (512MB heap) do not OOM.
 */
export function SoftLiveRefresh({
  /** Default 60s — keep light on small Dokploy / 4GB hosts. */
  intervalMs = 60_000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    function refreshIfVisible(force = false) {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      if (inFlightRef.current) return;

      const now = Date.now();
      // Ignore visibility spam / overlapping timers within 15s (unless forced by scan).
      if (!force && now - lastRefreshRef.current < 15_000) return;

      inFlightRef.current = true;
      lastRefreshRef.current = now;
      try {
        router.refresh();
      } finally {
        // router.refresh() is sync-scheduled; give RSC round-trip headroom
        // before allowing another poll.
        window.setTimeout(() => {
          inFlightRef.current = false;
        }, 8_000);
      }
    }

    const id = window.setInterval(() => refreshIfVisible(false), intervalMs);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        refreshIfVisible(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    const unsub = subscribeBoardingUpdated(() => {
      refreshIfVisible(true);
    });

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      unsub();
    };
  }, [router, intervalMs]);

  return null;
}

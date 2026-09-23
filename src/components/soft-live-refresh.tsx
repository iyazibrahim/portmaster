"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Soft-poll router.refresh while the tab is visible so status boards
 * (ops / passes / handler today) pick up CI/CO without a manual reload.
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
    function refreshIfVisible() {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      if (inFlightRef.current) return;

      const now = Date.now();
      // Ignore visibility spam / overlapping timers within 15s.
      if (now - lastRefreshRef.current < 15_000) return;

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

    const id = window.setInterval(refreshIfVisible, intervalMs);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        refreshIfVisible();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}

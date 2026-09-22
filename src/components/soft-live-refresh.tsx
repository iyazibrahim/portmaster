"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Soft-poll router.refresh while the tab is visible so status boards
 * (ops / passes / handler today) pick up CI/CO without a manual reload.
 * Avoid mounting this on /handler/scan — refresh there remounts the camera.
 */
export function SoftLiveRefresh({
  intervalMs = 12_000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    function refreshIfVisible() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        router.refresh();
      }
    }

    const id = window.setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}

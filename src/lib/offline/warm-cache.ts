/** Warm-cache static assets / navigations after an online visit (client-driven). */

const WARM_CACHE = "tiangpass-warm-v1";

export async function warmCacheUrls(urls: string[]) {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(WARM_CACHE);
    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { credentials: "same-origin" });
          if (res.ok) await cache.put(url, res.clone());
        } catch {
          // ignore individual warm failures
        }
      }),
    );
  } catch {
    // Cache API unavailable
  }
}

/** Ask SW to remember URLs without changing RSC bypass rules. */
export function notifySwWarm(urls: string[]) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (!controller) return;
  controller.postMessage({ type: "WARM_CACHE", urls });
}

export function warmOperatorShell() {
  const urls = ["/handler/scan", "/offline", "/manifest.webmanifest"];
  void warmCacheUrls(urls);
  notifySwWarm(urls);
}

export function warmPassShell(passId: string) {
  const urls = [
    `/pass/${passId}`,
    `/pass/${passId}/offline`,
    "/offline",
    "/manifest.webmanifest",
  ];
  void warmCacheUrls(urls);
  notifySwWarm(urls);
}

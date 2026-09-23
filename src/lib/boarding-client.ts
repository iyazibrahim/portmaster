"use client";

import type {
  BoardingPreviewResult,
  BoardingScanResult,
} from "@/lib/boarding-scan";

const BOARDING_EVENT = "tiangpass:boarding-updated";
const BOARDING_CHANNEL = "tiangpass-boarding";

/** Tell open status boards (ops / passes / pass detail) to refresh now. */
export function notifyBoardingUpdated(detail?: {
  passId?: string;
  status?: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BOARDING_EVENT, { detail: detail ?? {} }),
  );
  try {
    const ch = new BroadcastChannel(BOARDING_CHANNEL);
    ch.postMessage({ type: "boarding-updated", ...(detail ?? {}) });
    ch.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
}

export function subscribeBoardingUpdated(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  function onEvent() {
    handler();
  }
  window.addEventListener(BOARDING_EVENT, onEvent);

  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(BOARDING_CHANNEL);
    ch.onmessage = () => handler();
  } catch {
    ch = null;
  }

  return () => {
    window.removeEventListener(BOARDING_EVENT, onEvent);
    ch?.close();
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    /* non-JSON */
  }
  if (!res.ok && data && typeof data === "object" && data !== null && "error" in data) {
    return data;
  }
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Session expired. Reload and sign in again."
        : `Boarding request failed (${res.status}).`,
    );
  }
  if (!data) throw new Error("Empty boarding response.");
  return data;
}

/** Prefer stable API over Server Actions (deploy ID skew). */
export function apiPreviewPassToken(
  token: string,
): Promise<BoardingPreviewResult> {
  return postJson<BoardingPreviewResult>("/api/boarding/preview", { token });
}

export function apiScanToken(
  token: string,
  coords?: { lat?: string; lng?: string },
  clientEventId?: string,
  expectedAction?: "CHECK_IN" | "CHECK_OUT",
): Promise<BoardingScanResult> {
  return postJson<BoardingScanResult>("/api/boarding/scan", {
    token,
    lat: coords?.lat,
    lng: coords?.lng,
    clientEventId,
    expectedAction,
  });
}

export function isServerActionMismatch(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /failed to find server action|server action ["'`]?[0-9a-f]+/i.test(
    msg,
  );
}

/**
 * Pure local CI/CO rules for offline boarding (Phase 2).
 * Mirrors server transitions without DB I/O.
 */

import { assertWithinGeofence } from "@/lib/geo";
import type { ManifestPass } from "@/lib/offline/boarding-manifest";

type PassStatus = "ACTIVE" | "CHECKED_IN" | "CHECKED_OUT" | string;

function nextStatusAfterCheckIn(current: PassStatus): PassStatus | null {
  if (current === "ACTIVE") return "CHECKED_IN";
  return null;
}

function nextStatusAfterCheckOut(current: PassStatus): PassStatus | null {
  if (current === "CHECKED_IN") return "CHECKED_OUT";
  return null;
}

/** Calendar date in Asia/Kuala_Lumpur as YYYY-MM-DD (client-safe). */
export function todayMYTClient(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type ScanPreview = {
  passId: string;
  reference: string;
  status: string;
  validOn: string;
  anglerName: string;
  myKadLast4: string | null;
  photoKey: string | null;
  photoDataUrl?: string | null;
  pillarName: string;
  jettyName: string;
  nextAction: "CHECK_IN" | "CHECK_OUT" | null;
};

export type LocalScanInput = {
  pass: ManifestPass;
  isAdmin: boolean;
  requireJettyGps: boolean;
  handlerJettyId: string | null;
  coords?: { lat?: string; lng?: string } | null;
  today?: string;
  now?: Date;
};

export type LocalScanResult =
  | {
      ok: true;
      action: "CHECK_IN" | "CHECK_OUT";
      nextStatus: PassStatus;
      preview: ScanPreview;
    }
  | { ok: false; error: string };

function toPreview(
  pass: ManifestPass,
  status: string,
  nextAction: "CHECK_IN" | "CHECK_OUT" | null,
): ScanPreview {
  return {
    passId: pass.passId,
    reference: pass.reference,
    status,
    validOn: pass.validOn,
    anglerName: pass.anglerName,
    myKadLast4: pass.myKadLast4,
    photoKey: pass.photoKey,
    photoDataUrl: pass.photoDataUrl,
    pillarName: pass.pillarName,
    jettyName: pass.jettyName,
    nextAction,
  };
}

export function previewLocalPass(pass: ManifestPass): ScanPreview {
  let nextAction: "CHECK_IN" | "CHECK_OUT" | null = null;
  if (pass.status === "ACTIVE") nextAction = "CHECK_IN";
  else if (pass.status === "CHECKED_IN") nextAction = "CHECK_OUT";
  return toPreview(pass, pass.status, nextAction);
}

export function applyLocalScan(input: LocalScanInput): LocalScanResult {
  const { pass, isAdmin, requireJettyGps, handlerJettyId } = input;
  const today = input.today ?? todayMYTClient();
  const now = input.now ?? new Date();

  if (pass.revokedAt) {
    return { ok: false, error: "Token revoked." };
  }
  if (new Date(pass.tokenExpiresAt).getTime() < now.getTime()) {
    return { ok: false, error: "Token expired." };
  }

  if (!isAdmin && handlerJettyId && handlerJettyId !== pass.jettyId) {
    return {
      ok: false,
      error:
        "This pass was boarded at a different jetty. Use an operator at the boarding jetty.",
    };
  }

  const geo = assertWithinGeofence({
    device:
      input.coords?.lat != null && input.coords?.lng != null
        ? { lat: Number(input.coords.lat), lng: Number(input.coords.lng) }
        : null,
    jettyLat: pass.jettyLat,
    jettyLng: pass.jettyLng,
    radiusM: pass.geofenceRadiusM,
    bypass: isAdmin || !requireJettyGps,
    purpose: "boarding",
  });
  if (!geo.ok) return { ok: false, error: geo.error };

  if (pass.status === "ACTIVE") {
    if (pass.validOn !== today) {
      return {
        ok: false,
        error: `Pass is only valid for check-in on ${pass.validOn}.`,
      };
    }
    const next = nextStatusAfterCheckIn(pass.status as PassStatus);
    if (!next) return { ok: false, error: "Invalid check-in transition." };
    return {
      ok: true,
      action: "CHECK_IN",
      nextStatus: next,
      preview: toPreview(pass, next, "CHECK_OUT"),
    };
  }

  if (pass.status === "CHECKED_IN") {
    const next = nextStatusAfterCheckOut(pass.status as PassStatus);
    if (!next) return { ok: false, error: "Invalid check-out transition." };
    return {
      ok: true,
      action: "CHECK_OUT",
      nextStatus: next,
      preview: toPreview(pass, next, null),
    };
  }

  return {
    ok: false,
    error: `Pass cannot be scanned in status ${String(pass.status).replaceAll("_", " ")}.`,
  };
}

/**
 * Geofence helpers — haversine distance vs jetty radius.
 */

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export type GeoPoint = { lat: number; lng: number };

export type GeofencePurpose = "purchase" | "boarding";

export type GeofenceCheckInput = {
  device: GeoPoint | null | undefined;
  jettyLat: string | null | undefined;
  jettyLng: string | null | undefined;
  radiusM: number;
  /** Admin bypasses geofence entirely. */
  bypass?: boolean;
  purpose?: GeofencePurpose;
};

export type GeofenceCheckResult =
  | { ok: true; distanceM: number | null }
  | { ok: false; error: string };

export function parseCoord(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function geofenceCopy(purpose: GeofencePurpose = "purchase") {
  if (purpose === "boarding") {
    return {
      missingGps: "GPS is required. Enable location and stand at the boarding jetty.",
      jettyNotReady:
        "This jetty has no GPS coordinates. Contact Association Admin.",
      outOfRange:
        "You must be at this jetty to check in or check out (within the jetty radius).",
    };
  }
  return {
    missingGps: "You need to be at the jetty to buy a pass.",
    jettyNotReady:
      "This jetty is not set up for purchases. Contact Association Admin.",
    outOfRange: "You need to be at this jetty to buy a pass.",
  };
}

export function assertWithinGeofence(
  input: GeofenceCheckInput,
): GeofenceCheckResult {
  const copy = geofenceCopy(input.purpose);
  if (input.bypass) {
    return { ok: true, distanceM: null };
  }

  if (!input.device) {
    return {
      ok: false,
      error: copy.missingGps,
    };
  }

  const jLat = parseCoord(input.jettyLat);
  const jLng = parseCoord(input.jettyLng);
  if (jLat == null || jLng == null) {
    return {
      ok: false,
      error: copy.jettyNotReady,
    };
  }

  const distanceM = haversineMeters(
    input.device.lat,
    input.device.lng,
    jLat,
    jLng,
  );
  if (distanceM > input.radiusM) {
    return {
      ok: false,
      error: copy.outOfRange,
    };
  }
  return { ok: true, distanceM };
}

export function isBoatOperational(
  status: string,
  permitExpiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (status !== "ACTIVE") return false;
  if (permitExpiresAt && permitExpiresAt.getTime() < now.getTime()) {
    return false;
  }
  return true;
}

export function effectiveBoatStatus(
  status: string,
  permitExpiresAt: Date | null | undefined,
  now = new Date(),
): string {
  if (
    status === "ACTIVE" &&
    permitExpiresAt &&
    permitExpiresAt.getTime() < now.getTime()
  ) {
    return "PERMIT_EXPIRED";
  }
  return status;
}

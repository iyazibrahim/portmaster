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

export type GeofenceCheckInput = {
  device: GeoPoint | null | undefined;
  jettyLat: string | null | undefined;
  jettyLng: string | null | undefined;
  radiusM: number;
  /** Admin bypasses geofence entirely. */
  bypass?: boolean;
};

export type GeofenceCheckResult =
  | { ok: true; distanceM: number | null }
  | { ok: false; error: string };

export function parseCoord(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function assertWithinGeofence(
  input: GeofenceCheckInput,
): GeofenceCheckResult {
  if (input.bypass) {
    return { ok: true, distanceM: null };
  }

  if (!input.device) {
    return {
      ok: false,
      error: "You need to be at the jetty to buy a pass.",
    };
  }

  const jLat = parseCoord(input.jettyLat);
  const jLng = parseCoord(input.jettyLng);
  if (jLat == null || jLng == null) {
    return {
      ok: false,
      error: "This jetty is not set up for purchases. Contact Association Admin.",
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
      error: "You need to be at this jetty to buy a pass.",
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

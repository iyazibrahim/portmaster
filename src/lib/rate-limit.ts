/**
 * Simple in-memory sliding-window rate limiter (single Node process).
 * For multi-instance Dokploy later, swap for Redis / Upstash.
 */

type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const windowStart = now - input.windowMs;
  let bucket = store.get(input.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(input.key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= input.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + input.windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: Math.max(0, input.limit - bucket.timestamps.length),
  };
}

/** Best-effort client IP behind Dokploy / reverse proxy. */
export async function clientIpFromHeaders(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

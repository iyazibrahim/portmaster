/**
 * Sliding-window rate limiter in this Node process.
 * Dokploy should run a single app replica. Restart clears counts (acceptable).
 * For multi-instance later, swap for Redis / Upstash.
 */

type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

/** Cap distinct keys so a long-lived process does not grow without bound. */
const MAX_KEYS = 5_000;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

function pruneExpired(windowStart: number) {
  for (const [key, bucket] of store) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
    if (bucket.timestamps.length === 0) store.delete(key);
  }
}

function evictOldestIfNeeded() {
  while (store.size > MAX_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const windowStart = now - input.windowMs;

  if (store.size > MAX_KEYS * 0.8) {
    pruneExpired(windowStart);
    evictOldestIfNeeded();
  }

  let bucket = store.get(input.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(input.key, bucket);
    evictOldestIfNeeded();
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= input.limit) {
    const oldestTs = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldestTs + input.windowMs - now) / 1000),
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

/** Test helper — not for production call sites. */
export function _rateLimitStoreSizeForTests() {
  return store.size;
}

export function _rateLimitClearForTests() {
  store.clear();
}

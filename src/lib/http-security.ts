import { createHash, timingSafeEqual } from "crypto";

/** Compare secrets without leaking the value through early length checks. */
export function timingSafeEqualString(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

const LEAK =
  /failed query|select |insert |update |delete |syntax error|password authentication|ECONN|ENOTFOUND|node_modules|secret|stack/i;

/**
 * Keep intentional short messages (wrong pass state, geofence).
 * Hide driver, SQL, and secret-bearing errors.
 */
export function clientSafeMessage(err: unknown, fallback: string) {
  if (
    err instanceof Error &&
    err.message.length > 0 &&
    err.message.length <= 160 &&
    !err.message.includes("\n") &&
    !LEAK.test(err.message)
  ) {
    return err.message;
  }
  console.error(fallback, err);
  return fallback;
}

/** True when the public site URL is HTTPS, so cookies and redirects can follow. */
export function httpsPublicUrl() {
  const url = process.env.AUTH_URL || process.env.APP_URL || "";
  return url.startsWith("https://");
}

/** Redirect only when TLS is configured and the proxy says the request was HTTP. */
export function httpsRedirectTarget(input: {
  forwardedProto: string | null;
  host: string | null;
  path: string;
}) {
  if (!httpsPublicUrl()) return null;
  const proto = input.forwardedProto?.split(",")[0]?.trim();
  if (proto !== "http") return null;
  const host = input.host?.split(",")[0]?.trim();
  if (!host) return null;
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  if (bare === "localhost" || bare === "127.0.0.1" || bare === "::1") return null;
  return `https://${host}${input.path}`;
}

import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/http-security";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { runStorageCleanup } from "@/lib/storage-cleanup";

/**
 * Manual / scheduler cleanup endpoint.
 * Authorize with header: `Authorization: Bearer $CRON_SECRET`
 * (or `x-cron-secret: $CRON_SECRET`).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const ip = await clientIpFromHeaders();
  const limited = rateLimit({
    key: `cron:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim() ?? "";
  const allowed =
    (bearer.length > 0 && timingSafeEqualString(bearer, secret)) ||
    (headerSecret.length > 0 && timingSafeEqualString(headerSecret, secret));
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runStorageCleanup();
  return NextResponse.json({ ok: true, ...result });
}

import { NextResponse } from "next/server";
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

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runStorageCleanup();
  return NextResponse.json({ ok: true, ...result });
}

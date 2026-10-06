import { NextResponse } from "next/server";
import { runBoardingPreview } from "@/lib/boarding-scan";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { clientSafeMessage } from "@/lib/http-security";
import { parseBoardingPreviewBody } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

function boardingJson(
  body: { ok: boolean; error?: string; preview?: unknown },
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Stable boarding preview — avoids hashed Server Action ID deploy skew.
 * Every failure path returns clear JSON `{ ok: false, error }` (never HTML).
 */
export async function POST(req: Request) {
  try {
    const ip = await clientIpFromHeaders();
    const limited = rateLimit({
      key: `boarding-preview:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return boardingJson(
        {
          ok: false,
          error: `Too many previews. Try again in ${limited.retryAfterSec}s.`,
        },
        429,
      );
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return boardingJson(
        { ok: false, error: 'Invalid JSON body. Send { "token": "…" }.' },
        400,
      );
    }

    const parsed = parseBoardingPreviewBody(raw);
    if (!parsed.success) {
      return boardingJson(
        { ok: false, error: "Pass QR token required." },
        400,
      );
    }

    const result = await runBoardingPreview(parsed.data.token);
    return boardingJson(result, result.ok ? 200 : 400);
  } catch (err) {
    return boardingJson(
      {
        ok: false,
        error: clientSafeMessage(err, "Boarding preview failed unexpectedly."),
      },
      400,
    );
  }
}

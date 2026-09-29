import { NextResponse } from "next/server";
import { runBoardingScan } from "@/lib/boarding-scan";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { clientSafeMessage } from "@/lib/http-security";
import { boardingScanSchema } from "@/lib/validation/auth";

export const dynamic = "force-dynamic";

function boardingJson(
  body: { ok: boolean; error?: string; [key: string]: unknown },
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

/** Stable boarding scan — every failure path returns clear JSON. */
export async function POST(req: Request) {
  try {
    const ip = await clientIpFromHeaders();
    const limited = rateLimit({
      key: `boarding-scan:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limited.ok) {
      return boardingJson(
        {
          ok: false,
          error: `Too many scans. Try again in ${limited.retryAfterSec}s.`,
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

    const parsed = boardingScanSchema.safeParse(raw);
    if (!parsed.success) {
      return boardingJson(
        { ok: false, error: "Pass QR token required." },
        400,
      );
    }

    const { token, lat, lng, clientEventId, expectedAction } = parsed.data;

    const result = await runBoardingScan({
      token,
      lat,
      lng,
      clientEventId,
      expectedAction: expectedAction ?? undefined,
    });
    return boardingJson(result, result.ok ? 200 : 400);
  } catch (err) {
    return boardingJson(
      {
        ok: false,
        error: clientSafeMessage(err, "Boarding scan failed unexpectedly."),
      },
      400,
    );
  }
}

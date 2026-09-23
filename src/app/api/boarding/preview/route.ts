import { NextResponse } from "next/server";
import { runBoardingPreview } from "@/lib/boarding-scan";

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
    let body: { token?: string };
    try {
      body = (await req.json()) as { token?: string };
    } catch {
      return boardingJson(
        { ok: false, error: "Invalid JSON body. Send { \"token\": \"…\" }." },
        400,
      );
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return boardingJson(
        { ok: false, error: "Pass QR token required." },
        400,
      );
    }

    const result = await runBoardingPreview(token);
    // App-level failures (not found / auth) stay JSON; use 400 so clients
    // and ops load checks can assert on status + body together.
    return boardingJson(result, result.ok ? 200 : 400);
  } catch (err) {
    return boardingJson(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Boarding preview failed unexpectedly.",
      },
      400,
    );
  }
}

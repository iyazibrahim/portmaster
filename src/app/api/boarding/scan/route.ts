import { NextResponse } from "next/server";
import { runBoardingScan } from "@/lib/boarding-scan";

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
    let body: {
      token?: string;
      lat?: string;
      lng?: string;
      clientEventId?: string;
      expectedAction?: "CHECK_IN" | "CHECK_OUT";
    };
    try {
      body = (await req.json()) as typeof body;
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

    const expected =
      body.expectedAction === "CHECK_IN" || body.expectedAction === "CHECK_OUT"
        ? body.expectedAction
        : undefined;

    const result = await runBoardingScan({
      token,
      lat: typeof body.lat === "string" ? body.lat : undefined,
      lng: typeof body.lng === "string" ? body.lng : undefined,
      clientEventId:
        typeof body.clientEventId === "string" ? body.clientEventId : undefined,
      expectedAction: expected,
    });
    return boardingJson(result, result.ok ? 200 : 400);
  } catch (err) {
    return boardingJson(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Boarding scan failed unexpectedly.",
      },
      400,
    );
  }
}

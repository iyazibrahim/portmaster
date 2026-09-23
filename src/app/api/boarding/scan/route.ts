import { NextResponse } from "next/server";
import { runBoardingScan } from "@/lib/boarding-scan";

export const dynamic = "force-dynamic";

/** Stable boarding scan — avoids hashed Server Action ID deploy skew. */
export async function POST(req: Request) {
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
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Pass QR token required." },
      { status: 400 },
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
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

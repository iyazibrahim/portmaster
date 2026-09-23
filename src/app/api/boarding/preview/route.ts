import { NextResponse } from "next/server";
import { runBoardingPreview } from "@/lib/boarding-scan";

export const dynamic = "force-dynamic";

/** Stable boarding preview — avoids hashed Server Action ID deploy skew. */
export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
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
  const result = await runBoardingPreview(token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

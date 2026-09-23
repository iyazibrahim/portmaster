import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { handlers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { scanBoardingToken } from "@/lib/booking";

export type BoardingPreviewResult =
  | {
      ok: true;
      preview: {
        passId: string;
        reference: string;
        status: string;
        validOn: string;
        anglerName: string;
        myKadLast4: string | null;
        photoKey: string | null;
        pillarName: string;
        jettyName: string;
        nextAction: "CHECK_IN" | "CHECK_OUT" | null;
      };
    }
  | { ok: false; error: string };

export type BoardingScanResult =
  | {
      ok: true;
      kind: "pass";
      action: "CHECK_IN" | "CHECK_OUT";
      passId: string;
      reference: string;
      status: string;
      alreadyApplied?: boolean;
      conflict?: boolean;
    }
  | {
      ok: true;
      kind: "booking";
      action: "CHECK_IN" | "CHECK_OUT";
      bookingId: string;
      status: string;
    }
  | { ok: false; error: string };

async function boardableSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required. Reload and try again." };
  }
  if (session.user.role !== "HANDLER" && session.user.role !== "ADMIN") {
    return {
      ok: false as const,
      error: "Only operators and admin can scan passes.",
    };
  }
  return { ok: true as const, session };
}

/** Shared by Server Action + `/api/boarding/*` (stable URL across deploys). */
export async function runBoardingPreview(
  token: string,
): Promise<BoardingPreviewResult> {
  try {
    const gate = await boardableSession();
    if (!gate.ok) return { ok: false, error: gate.error };
    const { previewPassQrToken } = await import("@/lib/pass");
    const preview = await previewPassQrToken(token);
    if (!preview) return { ok: false, error: "Pass QR not found." };
    return { ok: true, preview };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not preview pass.",
    };
  }
}

export async function runBoardingScan(input: {
  token: string;
  lat?: string;
  lng?: string;
  clientEventId?: string;
  expectedAction?: "CHECK_IN" | "CHECK_OUT";
}): Promise<BoardingScanResult> {
  try {
    const gate = await boardableSession();
    if (!gate.ok) return { ok: false, error: gate.error };
    const session = gate.session;

    const [handler] = await db
      .select()
      .from(handlers)
      .where(eq(handlers.userId, session.user.id))
      .limit(1);

    if (!handler && session.user.role === "HANDLER") {
      return { ok: false, error: "Handler profile missing." };
    }

    const { scanPassQrToken } = await import("@/lib/pass");
    const passResult = await scanPassQrToken({
      token: input.token,
      handlerId: handler?.id ?? null,
      actorUserId: session.user.id,
      actorRole: session.user.role,
      lat: input.lat,
      lng: input.lng,
      clientEventId: input.clientEventId,
      expectedAction: input.expectedAction ?? null,
    });
    if (passResult) {
      // Never revalidate /handler/scan — remounts ScannerPanel and kills the camera.
      revalidatePath("/handler");
      revalidatePath("/admin/ops");
      revalidatePath("/admin/passes");
      revalidatePath("/trips");
      revalidatePath(`/pass/${passResult.passId}`);
      revalidatePath("/llm");
      return {
        ok: true,
        kind: "pass",
        action: passResult.action,
        passId: passResult.passId,
        reference: passResult.reference,
        status: passResult.status,
        alreadyApplied: passResult.alreadyApplied,
        conflict: passResult.conflict,
      };
    }

    if (!handler) {
      return { ok: false, error: "Unrecognized pass QR token." };
    }
    const result = await scanBoardingToken({
      token: input.token,
      handlerId: handler.id,
    });
    return {
      ok: true,
      kind: "booking",
      action: result.action,
      bookingId: result.booking.id,
      status: result.action === "CHECK_IN" ? "CHECKED_IN" : "COMPLETED",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Check-in failed.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireSession } from "@/lib/session";
import {
  cancelActivePass,
  createPassPendingPayment,
  mockPayPassFail,
  mockPayPassSuccess,
} from "@/lib/pass";

export type PassActionResult =
  | { ok: true; passId: string; reference?: string }
  | { ok: false; error: string };

export async function actionCreatePass(input: {
  jettyId: string;
  pillarId: string;
  lat?: string;
  lng?: string;
}): Promise<PassActionResult> {
  const session = await requireRole(["USER", "ADMIN"]);
  try {
    const result = await createPassPendingPayment({
      userId: session.user.id,
      jettyId: input.jettyId,
      pillarId: input.pillarId,
      lat: input.lat,
      lng: input.lng,
      actorId: session.user.id,
    });
    revalidatePath("/pass");
    return {
      ok: true,
      passId: result.passId,
      reference: result.reference,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create pass.",
    };
  }
}

export async function actionMockPaySuccess(
  passId: string,
): Promise<PassActionResult> {
  const session = await requireSession();
  try {
    const result = await mockPayPassSuccess(passId, session.user.id);
    revalidatePath("/pass");
    revalidatePath(`/pass/${passId}`);
    revalidatePath("/admin/ops");
    revalidatePath("/llm");
    return { ok: true, passId: result.passId, reference: result.reference };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Payment failed.",
    };
  }
}

export async function actionMockPayFail(
  passId: string,
): Promise<PassActionResult> {
  const session = await requireSession();
  try {
    await mockPayPassFail(passId, session.user.id);
    revalidatePath("/pass");
    return { ok: true, passId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not fail payment.",
    };
  }
}

export async function actionCancelPass(
  passId: string,
): Promise<PassActionResult> {
  const session = await requireSession();
  try {
    await cancelActivePass(passId, session.user.id, session.user.id);
    revalidatePath("/pass");
    return { ok: true, passId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not cancel pass.",
    };
  }
}

"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  handlers,
  jetties,
  locations,
  passQrTokens,
  passes,
  scanEvents,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/session";
import { todayMYT } from "@/lib/utils-app";
import { isJettyGeofenceRequired, scanPassQrToken } from "@/lib/pass";
import { writeAudit } from "@/lib/audit";
import { readProfilePhoto } from "@/lib/photos";

export type OfflineSyncEvent = {
  clientEventId: string;
  token: string;
  expectedAction: "CHECK_IN" | "CHECK_OUT";
  lat?: string;
  lng?: string;
  scannedAt?: string;
};

export async function actionFetchBoardingManifest(): Promise<
  | {
      ok: true;
      manifest: {
        fetchedAt: string;
        validOn: string;
        handlerJettyId: string | null;
        isAdmin: boolean;
        requireJettyGps: boolean;
        passes: Array<{
          passId: string;
          reference: string;
          status: string;
          validOn: string;
          token: string;
          tokenExpiresAt: string;
          revokedAt: string | null;
          anglerName: string;
          myKadLast4: string | null;
          photoKey: string | null;
          photoDataUrl: string | null;
          pillarName: string;
          jettyId: string;
          jettyName: string;
          jettyLat: string | null;
          jettyLng: string | null;
          geofenceRadiusM: number;
        }>;
      };
    }
  | { ok: false; error: string }
> {
  try {
    const session = await requireRole(["HANDLER", "ADMIN"]);
    const isAdmin = session.user.role === "ADMIN";
    const requireJettyGps = await isJettyGeofenceRequired();
    const validOn = todayMYT();

    const [handler] = await db
      .select()
      .from(handlers)
      .where(eq(handlers.userId, session.user.id))
      .limit(1);

    if (!isAdmin && !handler) {
      return { ok: false, error: "Handler profile missing." };
    }

    const handlerJettyId = handler?.jettyId ?? null;

    const statusFilter = inArray(passes.status, ["ACTIVE", "CHECKED_IN"]);
    const dayOrCheckedIn = and(
      statusFilter,
      sql`(
        (${passes.status} = 'ACTIVE' AND ${passes.validOn} = ${validOn})
        OR ${passes.status} = 'CHECKED_IN'
      )`,
    );

    const jettyFilter =
      !isAdmin && handlerJettyId
        ? and(dayOrCheckedIn, eq(passes.jettyId, handlerJettyId))
        : dayOrCheckedIn;

    const rows = await db
      .select({
        pass: passes,
        qr: passQrTokens,
        user: users,
        pillar: locations,
        jetty: jetties,
      })
      .from(passes)
      .innerJoin(
        passQrTokens,
        and(
          eq(passQrTokens.passId, passes.id),
          sql`${passQrTokens.revokedAt} is null`,
        ),
      )
      .innerJoin(users, eq(passes.userId, users.id))
      .innerJoin(locations, eq(passes.pillarId, locations.id))
      .innerJoin(jetties, eq(passes.jettyId, jetties.id))
      .where(jettyFilter);

    // Prefer one active token per pass (latest expiresAt)
    const byPass = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const prev = byPass.get(row.pass.id);
      if (!prev || row.qr.expiresAt > prev.qr.expiresAt) {
        byPass.set(row.pass.id, row);
      }
    }

    const passesOut = [];
    for (const row of byPass.values()) {
      let photoDataUrl: string | null = null;
      if (row.user.photoKey) {
        try {
          const file = await readProfilePhoto(row.user.photoKey);
          if (file) {
            const b64 = file.bytes.toString("base64");
            photoDataUrl = `data:${file.mimeType};base64,${b64}`;
          }
        } catch {
          photoDataUrl = null;
        }
      }
      passesOut.push({
        passId: row.pass.id,
        reference: row.pass.reference,
        status: row.pass.status,
        validOn: row.pass.validOn,
        token: row.qr.token,
        tokenExpiresAt: row.qr.expiresAt.toISOString(),
        revokedAt: row.qr.revokedAt?.toISOString() ?? null,
        anglerName: row.user.name,
        myKadLast4: row.user.myKadLast4,
        photoKey: row.user.photoKey,
        photoDataUrl,
        pillarName: row.pillar.name,
        jettyId: row.jetty.id,
        jettyName: row.jetty.name,
        jettyLat: row.jetty.lat,
        jettyLng: row.jetty.lng,
        geofenceRadiusM: row.jetty.geofenceRadiusM,
      });
    }

    return {
      ok: true,
      manifest: {
        fetchedAt: new Date().toISOString(),
        validOn,
        handlerJettyId,
        isAdmin,
        requireJettyGps,
        passes: passesOut,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not fetch boarding manifest.",
    };
  }
}

export async function actionSyncOfflineScans(
  events: OfflineSyncEvent[],
): Promise<
  | {
      ok: true;
      results: Array<{
        clientEventId: string;
        status: "synced" | "conflict" | "error";
        action?: "CHECK_IN" | "CHECK_OUT";
        passStatus?: string;
        error?: string;
      }>;
    }
  | { ok: false; error: string }
> {
  try {
    const session = await requireRole(["HANDLER", "ADMIN"]);
    const [handler] = await db
      .select()
      .from(handlers)
      .where(eq(handlers.userId, session.user.id))
      .limit(1);

    if (!handler && session.user.role === "HANDLER") {
      return { ok: false, error: "Handler profile missing." };
    }

    const ordered = [...events].sort((a, b) =>
      (a.scannedAt ?? "").localeCompare(b.scannedAt ?? ""),
    );

    const results: Array<{
      clientEventId: string;
      status: "synced" | "conflict" | "error";
      action?: "CHECK_IN" | "CHECK_OUT";
      passStatus?: string;
      error?: string;
    }> = [];

    for (const ev of ordered) {
      try {
        const scannedAt = ev.scannedAt ? new Date(ev.scannedAt) : new Date();
        const passResult = await scanPassQrToken({
          token: ev.token,
          handlerId: handler?.id ?? null,
          actorUserId: session.user.id,
          actorRole: session.user.role,
          lat: ev.lat,
          lng: ev.lng,
          clientEventId: ev.clientEventId,
          expectedAction: ev.expectedAction,
          scannedAt,
          recordConflict: true,
        });
        if (!passResult) {
          results.push({
            clientEventId: ev.clientEventId,
            status: "error",
            error: "Pass QR not found.",
          });
          continue;
        }
        results.push({
          clientEventId: ev.clientEventId,
          status: passResult.conflict ? "conflict" : "synced",
          action: passResult.action,
          passStatus: passResult.status,
        });
      } catch (err) {
        results.push({
          clientEventId: ev.clientEventId,
          status: "error",
          error: err instanceof Error ? err.message : "Sync failed.",
        });
      }
    }

    return { ok: true, results };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed.",
    };
  }
}

export async function actionListScanConflicts(): Promise<
  Array<{
    id: string;
    passId: string | null;
    reference: string | null;
    type: string;
    note: string | null;
    scannedAt: string;
    actorUserId: string | null;
    clientEventId: string | null;
    passStatus: string | null;
  }>
> {
  await requireRole(["ADMIN"]);
  const rows = await db
    .select({
      event: scanEvents,
      pass: passes,
    })
    .from(scanEvents)
    .leftJoin(passes, eq(scanEvents.passId, passes.id))
    .where(eq(scanEvents.conflictFlag, true))
    .orderBy(desc(scanEvents.scannedAt))
    .limit(100);

  return rows.map((r) => ({
    id: r.event.id,
    passId: r.event.passId,
    reference: r.pass?.reference ?? null,
    type: r.event.type,
    note: r.event.note,
    scannedAt: r.event.scannedAt.toISOString(),
    actorUserId: r.event.actorUserId,
    clientEventId: r.event.clientEventId,
    passStatus: r.pass?.status ?? null,
  }));
}

export async function actionResolveScanConflict(input: {
  scanEventId: string;
  resolution: "keep_server" | "force_check_in" | "force_check_out";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireRole(["ADMIN"]);
    const [event] = await db
      .select()
      .from(scanEvents)
      .where(eq(scanEvents.id, input.scanEventId))
      .limit(1);
    if (!event) return { ok: false, error: "Conflict event not found." };
    if (!event.passId) return { ok: false, error: "No pass on this event." };

    const [pass] = await db
      .select()
      .from(passes)
      .where(eq(passes.id, event.passId))
      .limit(1);
    if (!pass) return { ok: false, error: "Pass not found." };

    const now = new Date();
    if (input.resolution === "force_check_in") {
      await db
        .update(passes)
        .set({
          status: "CHECKED_IN",
          checkedInAt: pass.checkedInAt ?? now,
          checkedOutAt: null,
          updatedAt: now,
        })
        .where(eq(passes.id, pass.id));
    } else if (input.resolution === "force_check_out") {
      await db
        .update(passes)
        .set({
          status: "CHECKED_OUT",
          checkedOutAt: now,
          updatedAt: now,
        })
        .where(eq(passes.id, pass.id));
    }

    await db
      .update(scanEvents)
      .set({
        conflictFlag: false,
        note: `${event.note ?? ""} · resolved:${input.resolution}`.trim(),
      })
      .where(eq(scanEvents.id, event.id));

    await writeAudit({
      actorId: session.user.id,
      action: "pass.sync_conflict_resolve",
      entityType: "scan_event",
      entityId: event.id,
      next: { resolution: input.resolution, passId: pass.id },
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Resolve failed.",
    };
  }
}

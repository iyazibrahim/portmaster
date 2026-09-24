import { and, eq, isNotNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  bookingAccessTokens,
  passQrTokens,
  sessions,
  settings,
  verificationTokens,
} from "@/db/schema";

/** Product retention: audit trail kept for one year. */
export const AUDIT_RETENTION_DAYS = 365;

/** Used / revoked QR & boarding tokens kept briefly for support, then purged. */
export const TOKEN_GRAVEYARD_DAYS = 14;

const CLEANUP_SETTING_KEY = "storage_cleanup_last_run";
const CLEANUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type StorageCleanupResult = {
  sessionsDeleted: number;
  passQrDeleted: number;
  bookingTokensDeleted: number;
  verificationDeleted: number;
  auditDeleted: number;
  ranAt: string;
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Purge expired sessions, stale QR / boarding / verification tokens,
 * and audit rows older than {@link AUDIT_RETENTION_DAYS}.
 */
export async function runStorageCleanup(): Promise<StorageCleanupResult> {
  const now = new Date();
  const auditCutoff = daysAgo(AUDIT_RETENTION_DAYS);
  const tokenGraveyard = daysAgo(TOKEN_GRAVEYARD_DAYS);

  const expiredSessions = await db
    .delete(sessions)
    .where(lt(sessions.expires, now))
    .returning({ sessionToken: sessions.sessionToken });

  const expiredPassQr = await db
    .delete(passQrTokens)
    .where(
      or(
        lt(passQrTokens.expiresAt, now),
        and(isNotNull(passQrTokens.usedAt), lte(passQrTokens.usedAt, tokenGraveyard)),
        and(
          isNotNull(passQrTokens.revokedAt),
          lte(passQrTokens.revokedAt, tokenGraveyard),
        ),
      ),
    )
    .returning({ id: passQrTokens.id });

  const expiredBookingTokens = await db
    .delete(bookingAccessTokens)
    .where(
      or(
        lt(bookingAccessTokens.expiresAt, now),
        and(
          isNotNull(bookingAccessTokens.usedAt),
          lte(bookingAccessTokens.usedAt, tokenGraveyard),
        ),
        and(
          isNotNull(bookingAccessTokens.revokedAt),
          lte(bookingAccessTokens.revokedAt, tokenGraveyard),
        ),
      ),
    )
    .returning({ id: bookingAccessTokens.id });

  const expiredVerification = await db
    .delete(verificationTokens)
    .where(lt(verificationTokens.expires, now))
    .returning({
      identifier: verificationTokens.identifier,
      token: verificationTokens.token,
    });

  const oldAudit = await db
    .delete(auditLogs)
    .where(lt(auditLogs.createdAt, auditCutoff))
    .returning({ id: auditLogs.id });

  const ranAt = now.toISOString();
  await db
    .insert(settings)
    .values({
      key: CLEANUP_SETTING_KEY,
      value: ranAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: ranAt, updatedAt: now },
    });

  return {
    sessionsDeleted: expiredSessions.length,
    passQrDeleted: expiredPassQr.length,
    bookingTokensDeleted: expiredBookingTokens.length,
    verificationDeleted: expiredVerification.length,
    auditDeleted: oldAudit.length,
    ranAt,
  };
}

/**
 * Run cleanup at most once per 24h (safe to call from admin page loads).
 * Returns null when skipped.
 */
export async function maybeRunStorageCleanup(): Promise<StorageCleanupResult | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, CLEANUP_SETTING_KEY))
    .limit(1);

  if (row?.value) {
    const last = Date.parse(row.value);
    if (Number.isFinite(last) && Date.now() - last < CLEANUP_MIN_INTERVAL_MS) {
      return null;
    }
  }

  return runStorageCleanup();
}

/** Pure helper for tests / docs. */
export function auditRetentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

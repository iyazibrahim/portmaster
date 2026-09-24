import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { formatEnumLabel, id } from "@/lib/utils-app";

/** Cap audit meta JSON so logs stay small (1-year retention is enough volume control). */
export const AUDIT_META_MAX_CHARS = 2_000;

const SENSITIVE_META_KEYS = new Set([
  "password",
  "passwordHash",
  "photoBase64",
  "base64",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "myKad",
  "myKadHash",
]);

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 3) return "[truncated]";
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((v) => sanitizeValue(v, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_META_KEYS.has(k)) continue;
      const cleaned = sanitizeValue(v, depth + 1);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return String(value);
}

/** Build compact, redacted meta for audit rows. */
export function buildAuditMetaJson(input: {
  prev?: unknown;
  next?: unknown;
  meta?: Record<string, unknown>;
}): string | null {
  const meta: Record<string, unknown> = {};
  if (input.meta) {
    const cleaned = sanitizeValue(input.meta, 0);
    if (cleaned && typeof cleaned === "object") {
      Object.assign(meta, cleaned);
    }
  }
  if (input.prev !== undefined) {
    const cleaned = sanitizeValue(input.prev, 0);
    if (cleaned !== undefined) meta.prev = cleaned;
  }
  if (input.next !== undefined) {
    const cleaned = sanitizeValue(input.next, 0);
    if (cleaned !== undefined) meta.next = cleaned;
  }
  if (Object.keys(meta).length === 0) return null;
  let json = JSON.stringify(meta);
  if (json.length > AUDIT_META_MAX_CHARS) {
    let previewLen = Math.max(64, AUDIT_META_MAX_CHARS - 48);
    let out = JSON.stringify({
      truncated: true,
      preview: json.slice(0, previewLen),
    });
    while (out.length > AUDIT_META_MAX_CHARS && previewLen > 64) {
      previewLen = Math.floor(previewLen * 0.85);
      out = JSON.stringify({
        truncated: true,
        preview: json.slice(0, previewLen),
      });
    }
    json = out;
  }
  return json;
}

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  prev?: unknown;
  next?: unknown;
  meta?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: id("aud"),
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metaJson: buildAuditMetaJson(input),
  });
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "pass.create_pending": "Pass created (awaiting payment)",
  "pass.pay_success": "Pass payment successful",
  "pass.cancel": "Pass cancelled",
  "pass.check_in": "Pass checked in",
  "pass.check_out": "Pass checked out",
  "pass.self_check_out": "Pass self checked out (angler)",
  "pass.overnight_intention": "Overnight stay intention updated",
  "pass.sync_conflict_resolve": "Offline scan conflict resolved",
  "pillar.create": "Pillar created",
  "pillar.update": "Pillar updated",
  "pillar.status": "Pillar status changed",
  "user.account_status": "Account status changed",
  "boat_owner.create": "Boat owner created",
  "boat_owner.update": "Boat owner updated",
  "boat.create": "Boat created",
  "boat.update": "Boat updated",
  "user.delete_account": "Account deleted (anonymised)",
  "handler.link_owner": "Handler linked to boat owner",
  "handler.update": "Handler updated",
  "alert.resolve": "Alert resolved",
  "incident.create": "Incident logged",
  "incident.status": "Incident status updated",
};

const ENTITY_LABELS: Record<string, string> = {
  pass: "Pass",
  pillar: "Pillar",
  location: "Location",
  user: "User",
  boat: "Boat",
  boat_owner: "Boat owner",
  handler: "Handler",
  jetty: "Jetty",
  booking: "Booking",
  alert: "Alert",
  incident: "Incident",
  scan_event: "Scan event",
};

/** Plain English for audit action codes. */
export function formatAuditAction(action: string) {
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action];
  return formatEnumLabel(action.replaceAll(".", "_"));
}

export function formatAuditEntity(entityType: string) {
  return ENTITY_LABELS[entityType] ?? formatEnumLabel(entityType);
}

/** Friendly Asia/KL datetime for audit tables. */
export function formatAuditWhen(date: Date) {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

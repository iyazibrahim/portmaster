import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { formatEnumLabel, id } from "@/lib/utils-app";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  prev?: unknown;
  next?: unknown;
  meta?: Record<string, unknown>;
}) {
  const meta: Record<string, unknown> = { ...(input.meta ?? {}) };
  if (input.prev !== undefined) meta.prev = input.prev;
  if (input.next !== undefined) meta.next = input.next;

  await db.insert(auditLogs).values({
    id: id("aud"),
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metaJson: Object.keys(meta).length > 0 ? JSON.stringify(meta) : null,
  });
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "pass.create_pending": "Pass created (awaiting payment)",
  "pass.pay_success": "Pass payment successful",
  "pass.cancel": "Pass cancelled",
  "pass.check_in": "Pass checked in",
  "pass.check_out": "Pass checked out",
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

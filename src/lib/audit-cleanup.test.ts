import { describe, expect, it } from "vitest";
import { AUDIT_META_MAX_CHARS, buildAuditMetaJson } from "@/lib/audit";
import {
  AUDIT_RETENTION_DAYS,
  auditRetentionCutoff,
} from "@/lib/storage-cleanup";

describe("buildAuditMetaJson", () => {
  it("returns null when empty", () => {
    expect(buildAuditMetaJson({})).toBeNull();
  });

  it("keeps small prev/next status diffs", () => {
    const json = buildAuditMetaJson({
      prev: { status: "ACTIVE" },
      next: { status: "CANCELLED" },
    });
    expect(json).toBeTruthy();
    expect(JSON.parse(json!)).toEqual({
      prev: { status: "ACTIVE" },
      next: { status: "CANCELLED" },
    });
  });

  it("strips sensitive keys", () => {
    const json = buildAuditMetaJson({
      meta: {
        password: "secret",
        photoBase64: "AAAA",
        ok: true,
      },
    });
    expect(JSON.parse(json!)).toEqual({ ok: true });
  });

  it("truncates oversized payloads", () => {
    const meta: Record<string, unknown> = {};
    for (let i = 0; i < 120; i += 1) {
      meta[`field_${i}`] = "abcdefghijklmnopqrstuvwxyz0123456789";
    }
    const json = buildAuditMetaJson({ meta });
    expect(json!.length).toBeLessThanOrEqual(AUDIT_META_MAX_CHARS + 80);
    expect(JSON.parse(json!).truncated).toBe(true);
  });
});

describe("auditRetentionCutoff", () => {
  it("is 365 days before now", () => {
    const now = new Date("2026-09-24T00:00:00.000Z");
    const cut = auditRetentionCutoff(now);
    expect(AUDIT_RETENTION_DAYS).toBe(365);
    expect(cut.toISOString()).toBe("2025-09-24T00:00:00.000Z");
  });
});

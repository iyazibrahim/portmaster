import { describe, expect, it } from "vitest";
import { applyLocalScan, previewLocalPass } from "./local-scan";
import type { ManifestPass } from "./boarding-manifest";
import { isNetworkError } from "./scan-queue";

function samplePass(overrides: Partial<ManifestPass> = {}): ManifestPass {
  return {
    passId: "pas_1",
    reference: "PM-20260922-ABC",
    status: "ACTIVE",
    validOn: "2026-09-22",
    token: "tok-demo",
    tokenExpiresAt: "2099-01-01T00:00:00.000Z",
    revokedAt: null,
    anglerName: "Test Angler",
    myKadLast4: "5678",
    photoKey: null,
    photoDataUrl: null,
    pillarName: "Pillar 1",
    jettyId: "jet_1",
    jettyName: "Batu Uban",
    jettyLat: "5.36",
    jettyLng: "100.31",
    geofenceRadiusM: 100,
    ...overrides,
  };
}

describe("local offline CI/CO", () => {
  it("previews check-in for ACTIVE", () => {
    const p = previewLocalPass(samplePass());
    expect(p.nextAction).toBe("CHECK_IN");
  });

  it("applies check-in and returns CHECKED_IN", () => {
    const r = applyLocalScan({
      pass: samplePass(),
      isAdmin: true,
      requireJettyGps: false,
      handlerJettyId: "jet_1",
      today: "2026-09-22",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.action).toBe("CHECK_IN");
      expect(r.nextStatus).toBe("CHECKED_IN");
    }
  });

  it("applies check-out from CHECKED_IN", () => {
    const r = applyLocalScan({
      pass: samplePass({ status: "CHECKED_IN" }),
      isAdmin: true,
      requireJettyGps: false,
      handlerJettyId: "jet_1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.action).toBe("CHECK_OUT");
      expect(r.nextStatus).toBe("CHECKED_OUT");
    }
  });

  it("rejects wrong jetty for handler", () => {
    const r = applyLocalScan({
      pass: samplePass(),
      isAdmin: false,
      requireJettyGps: false,
      handlerJettyId: "jet_other",
      today: "2026-09-22",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects check-in on wrong day", () => {
    const r = applyLocalScan({
      pass: samplePass({ validOn: "2026-09-21" }),
      isAdmin: true,
      requireJettyGps: false,
      handlerJettyId: "jet_1",
      today: "2026-09-22",
    });
    expect(r.ok).toBe(false);
  });
});

describe("isNetworkError", () => {
  it("detects TypeError and timeout", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new DOMException("timeout", "AbortError"))).toBe(
      true,
    );
    expect(isNetworkError(new Error("Pass not found"))).toBe(false);
  });
});

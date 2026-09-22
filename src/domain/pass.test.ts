import { describe, expect, it } from "vitest";
import {
  assertCanCreatePass,
  assertCanSetOvernightIntention,
  addCalendarDays,
  canReserveSlot,
  canSelfCheckOut,
  canUpdateOvernightIntention,
  defaultExpectedReturnOn,
  remainingSlots,
  validateAnglerIdentity,
  nextStatusAfterPaymentSuccess,
  nextStatusAfterPaymentFail,
  nextStatusAfterCheckIn,
  nextStatusAfterCheckOut,
  nextStatusAfterSelfCheckOut,
  canCancelPass,
  isOverdue,
  reservationExpiresAt,
  isReservationExpired,
  shouldExpireActivePass,
  shouldRemindSelfCheckOut,
} from "../domain/pass";
import type { PassStatus } from "../db/schema";
import { assertWithinGeofence, haversineMeters } from "../lib/geo";
import { PILLAR_MAX_PAX, todayMYT } from "../lib/utils-app";

describe("AC-001 identity gates", () => {
  it("rejects non-Malaysian", () => {
    const r = validateAnglerIdentity({
      myKad: "900101145678",
      citizenship: "OTHER",
      dob: "1990-01-01",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Malaysian/i);
  });

  it("rejects age under 14", () => {
    const today = todayMYT();
    const [y] = today.split("-").map(Number);
    const dob = `${y - 10}-06-15`;
    const r = validateAnglerIdentity({
      myKad: "150615145678",
      citizenship: "MY",
      dob,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/14/);
  });

  it("accepts Malaysian 14+", () => {
    const r = validateAnglerIdentity({
      myKad: "900101145678",
      citizenship: "MY",
      dob: "1990-01-01",
    });
    expect(r.ok).toBe(true);
  });
});

describe("AC-002 MyKad format", () => {
  it("rejects invalid MyKad length", () => {
    const r = validateAnglerIdentity({
      myKad: "123",
      citizenship: "MY",
      dob: "1990-01-01",
    });
    expect(r.ok).toBe(false);
  });
});

describe("AC-004 / AC-005 pass rules", () => {
  const base: {
    accountStatus: "ACTIVE";
    existingSameDayStatuses: PassStatus[];
    pillarStatus: "AVAILABLE";
    pillarJettyId: string;
    boardingJettyId: string;
    occupancy: { heldCount: number };
    maxOccupancy: number;
    validOn: string;
  } = {
    accountStatus: "ACTIVE",
    existingSameDayStatuses: [],
    pillarStatus: "AVAILABLE",
    pillarJettyId: "j1",
    boardingJettyId: "j1",
    occupancy: { heldCount: 0 },
    maxOccupancy: 4,
    validOn: todayMYT(),
  };

  it("allows first pass of the day", () => {
    const r = assertCanCreatePass({ ...base, existingSameDayStatuses: [] });
    expect(r.ok).toBe(true);
  });

  it("blocks second pass same day", () => {
    const r = assertCanCreatePass({
      ...base,
      existingSameDayStatuses: ["ACTIVE"],
    });
    expect(r.ok).toBe(false);
  });

  it("allows second pass same day when allowMultipleSameDay", () => {
    const r = assertCanCreatePass({
      ...base,
      existingSameDayStatuses: ["ACTIVE", "CHECKED_IN"],
      allowMultipleSameDay: true,
    });
    expect(r.ok).toBe(true);
  });

  it("blocks blacklisted accounts", () => {
    const r = assertCanCreatePass({
      ...base,
      accountStatus: "BLACKLISTED",
    });
    expect(r.ok).toBe(false);
  });

  it("blocks full pillar using per-pillar max", () => {
    expect(canReserveSlot({ heldCount: 4 }, 4)).toBe(false);
    expect(remainingSlots({ heldCount: 3 }, 4)).toBe(1);
    expect(canReserveSlot({ heldCount: 4 }, 6)).toBe(true);
    const r = assertCanCreatePass({
      ...base,
      occupancy: { heldCount: 4 },
      maxOccupancy: 4,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects non-AVAILABLE pillars", () => {
    const r = assertCanCreatePass({
      ...base,
      pillarStatus: "UNDER_MAINTENANCE",
    });
    expect(r.ok).toBe(false);
  });

  it("requires pillar on boarding jetty", () => {
    const r = assertCanCreatePass({
      ...base,
      pillarJettyId: "other",
    });
    expect(r.ok).toBe(false);
  });
});

describe("overnight Active expiry", () => {
  it("expires Active from prior day", () => {
    expect(shouldExpireActivePass("ACTIVE", "2026-09-01", "2026-09-02")).toBe(
      true,
    );
    expect(shouldExpireActivePass("CHECKED_IN", "2026-09-01", "2026-09-02")).toBe(
      false,
    );
    expect(shouldExpireActivePass("ACTIVE", "2026-09-02", "2026-09-02")).toBe(
      false,
    );
  });
});

describe("geofence", () => {
  it("computes haversine distance", () => {
    const d = haversineMeters(5.36, 100.31, 5.36, 100.31);
    expect(d).toBeLessThan(1);
  });

  it("rejects missing GPS", () => {
    const r = assertWithinGeofence({
      device: null,
      jettyLat: "5.36",
      jettyLng: "100.31",
      radiusM: 250,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/buy a pass/i);
  });

  it("uses boarding copy for operator check-in", () => {
    const r = assertWithinGeofence({
      device: { lat: 1, lng: 1 },
      jettyLat: "5.36",
      jettyLng: "100.31",
      radiusM: 100,
      purpose: "boarding",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/from this jetty/i);
  });

  it("allows admin bypass", () => {
    const r = assertWithinGeofence({
      device: null,
      jettyLat: "5.36",
      jettyLng: "100.31",
      radiusM: 250,
      bypass: true,
    });
    expect(r.ok).toBe(true);
  });

  it("accepts device inside radius", () => {
    const r = assertWithinGeofence({
      device: { lat: 5.3601, lng: 100.3101 },
      jettyLat: "5.36",
      jettyLng: "100.31",
      radiusM: 250,
    });
    expect(r.ok).toBe(true);
  });
});

describe("AC-006 payment status transitions", () => {
  it("pending → active on success", () => {
    expect(nextStatusAfterPaymentSuccess("PENDING_PAYMENT")).toBe("ACTIVE");
  });

  it("pending → cancelled on fail", () => {
    expect(nextStatusAfterPaymentFail("PENDING_PAYMENT")).toBe("CANCELLED");
  });

  it("reservation expiry helper", () => {
    const until = reservationExpiresAt(new Date("2026-01-01T10:00:00Z"), 10);
    expect(until.toISOString()).toBe("2026-01-01T10:10:00.000Z");
    expect(
      isReservationExpired(until, new Date("2026-01-01T10:11:00Z")),
    ).toBe(true);
  });
});

describe("pass QR check-in / check-out transitions", () => {
  it("active → checked_in", () => {
    expect(nextStatusAfterCheckIn("ACTIVE")).toBe("CHECKED_IN");
    expect(nextStatusAfterCheckIn("CHECKED_IN")).toBeNull();
    expect(nextStatusAfterCheckIn("PENDING_PAYMENT")).toBeNull();
  });

  it("checked_in → checked_out", () => {
    expect(nextStatusAfterCheckOut("CHECKED_IN")).toBe("CHECKED_OUT");
    expect(nextStatusAfterCheckOut("ACTIVE")).toBeNull();
    expect(nextStatusAfterCheckOut("CHECKED_OUT")).toBeNull();
  });
});

describe("cancel / overdue", () => {
  it("allows cancel of Active", () => {
    expect(canCancelPass("ACTIVE")).toBe(true);
    expect(canCancelPass("CHECKED_IN")).toBe(false);
  });

  it("detects overdue after N hours", () => {
    const checkedInAt = new Date(Date.now() - 9 * 3600_000);
    expect(isOverdue(checkedInAt, 8)).toBe(true);
    expect(isOverdue(checkedInAt, 10)).toBe(false);
  });
});

describe("overnight intention + self-checkout (Phase B)", () => {
  it("adds calendar days", () => {
    expect(addCalendarDays("2026-09-22", 1)).toBe("2026-09-23");
    expect(addCalendarDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(defaultExpectedReturnOn("2026-09-22")).toBe("2026-09-23");
  });

  it("clears expected return when not overnight", () => {
    const r = assertCanSetOvernightIntention({
      intendsOvernight: false,
      expectedReturnOn: "2026-09-23",
      validOn: "2026-09-22",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intendsOvernight).toBe(false);
      expect(r.expectedReturnOn).toBeNull();
    }
  });

  it("requires expected return after validOn within max nights", () => {
    expect(
      assertCanSetOvernightIntention({
        intendsOvernight: true,
        expectedReturnOn: "2026-09-22",
        validOn: "2026-09-22",
      }).ok,
    ).toBe(false);
    expect(
      assertCanSetOvernightIntention({
        intendsOvernight: true,
        expectedReturnOn: "2026-09-26",
        validOn: "2026-09-22",
        maxNights: 3,
      }).ok,
    ).toBe(false);
    const ok = assertCanSetOvernightIntention({
      intendsOvernight: true,
      expectedReturnOn: "2026-09-25",
      validOn: "2026-09-22",
      maxNights: 3,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.expectedReturnOn).toBe("2026-09-25");
  });

  it("allows self-checkout only when checked in", () => {
    expect(canSelfCheckOut("CHECKED_IN")).toBe(true);
    expect(canSelfCheckOut("ACTIVE")).toBe(false);
    expect(nextStatusAfterSelfCheckOut("CHECKED_IN")).toBe("CHECKED_OUT");
    expect(canUpdateOvernightIntention("ACTIVE")).toBe(true);
    expect(canUpdateOvernightIntention("CHECKED_OUT")).toBe(false);
  });

  it("reminds when past expected return or overdue hours", () => {
    expect(
      shouldRemindSelfCheckOut({
        status: "CHECKED_IN",
        expectedReturnOn: "2026-09-21",
        checkedInAt: new Date(),
        overdueHours: 8,
        today: "2026-09-22",
      }),
    ).toBe(true);
    expect(
      shouldRemindSelfCheckOut({
        status: "CHECKED_IN",
        expectedReturnOn: "2026-09-23",
        checkedInAt: new Date(Date.now() - 9 * 3600_000),
        overdueHours: 8,
        today: "2026-09-22",
      }),
    ).toBe(true);
    expect(
      shouldRemindSelfCheckOut({
        status: "ACTIVE",
        expectedReturnOn: "2026-09-21",
        checkedInAt: null,
        overdueHours: 8,
        today: "2026-09-22",
      }),
    ).toBe(false);
  });
});

// silence unused import if tree-shaken oddly
void PILLAR_MAX_PAX;

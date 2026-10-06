import { describe, expect, it } from "vitest";
import {
  parseBoardingPreviewBody,
  parseBoardingScanBody,
} from "./auth";

const token = "demo-qr-token-siti-checked-in";

describe("boarding scan body", () => {
  it("accepts the same token preview accepts, plus null coordinates", () => {
    const preview = parseBoardingPreviewBody({ token });
    const scan = parseBoardingScanBody({
      token,
      lat: null,
      lng: null,
      clientEventId: "cev_abc",
      expectedAction: null,
    });
    expect(preview.success).toBe(true);
    expect(scan.success).toBe(true);
    if (scan.success) {
      expect(scan.data.token).toBe(token);
      expect(scan.data.lat).toBeUndefined();
      expect(scan.data.expectedAction).toBeUndefined();
    }
  });

  it("coerces numeric coordinates and keeps a valid token", () => {
    const scan = parseBoardingScanBody({
      token,
      lat: 5.3268,
      lng: 100.4165,
      expectedAction: "CHECK_IN",
    });
    expect(scan.success).toBe(true);
    if (scan.success) {
      expect(scan.data.lat).toBe("5.3268");
      expect(scan.data.lng).toBe("100.4165");
      expect(scan.data.expectedAction).toBe("CHECK_IN");
    }
  });

  it("reads a token encoded as a link", () => {
    const scan = parseBoardingScanBody({
      qr: `https://tiangpass.local/pass/qr?token=${token}`,
    });
    expect(scan.success).toBe(true);
    if (scan.success) expect(scan.data.token).toBe(token);
  });

  it("still requires a token", () => {
    const scan = parseBoardingScanBody({ lat: "1", lng: "2" });
    expect(scan.success).toBe(false);
  });
});

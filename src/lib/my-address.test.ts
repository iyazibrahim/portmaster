import { describe, expect, it } from "vitest";
import { validateMalaysianAddress } from "./my-address";

describe("validateMalaysianAddress", () => {
  it("accepts a Penang postcode and formats one line", () => {
    const result = validateMalaysianAddress({
      unit: "  12A ",
      street: "Jalan Hashim",
      postcode: "11900",
      stateId: "PNG",
    });
    expect(result).toEqual({
      ok: true,
      formatted: "12A, Jalan Hashim, 11900 Pulau Pinang",
    });
  });

  it("rejects a postcode from another state", () => {
    const result = validateMalaysianAddress({
      unit: "1",
      street: "Jalan Bukit Bintang",
      postcode: "11900",
      stateId: "JHR",
    });
    expect(result).toEqual({ ok: false, code: "postcode_state" });
  });

  it("rejects a postcode that is not 5 digits", () => {
    const result = validateMalaysianAddress({
      unit: "1",
      street: "Jalan Hashim",
      postcode: "1190",
      stateId: "PNG",
    });
    expect(result).toEqual({ ok: false, code: "postcode" });
  });

  it("rejects a missing house number", () => {
    const result = validateMalaysianAddress({
      unit: "   ",
      street: "Jalan Hashim",
      postcode: "11900",
      stateId: "PNG",
    });
    expect(result).toEqual({ ok: false, code: "unit" });
  });
});

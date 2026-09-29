import { describe, expect, it } from "vitest";
import { formatMyKad, parseMyKadDobPrefix } from "./my-kad";

describe("formatMyKad", () => {
  it("groups digits as YYMMDD-PB-XXXX", () => {
    expect(formatMyKad("900101145678")).toBe("900101-14-5678");
  });
});

describe("parseMyKadDobPrefix", () => {
  it("reads a date from the first six digits", () => {
    expect(parseMyKadDobPrefix("900101")).toBe("1990-01-01");
  });

  it("rejects a calendar date that does not exist", () => {
    expect(parseMyKadDobPrefix("900231")).toBeNull();
  });
});

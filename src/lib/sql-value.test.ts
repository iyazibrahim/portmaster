import { describe, expect, it } from "vitest";
import { asSqlTimestamp } from "./sql-value";

describe("asSqlTimestamp", () => {
  it("converts Date to an ISO string postgres.js can encode", () => {
    const value = asSqlTimestamp(new Date("2026-09-22T02:00:00.000Z"));
    expect(typeof value).toBe("string");
    expect(value).toBe("2026-09-22T02:00:00.000Z");
  });

  it("passes through ISO strings", () => {
    expect(asSqlTimestamp("2026-09-22T02:00:00.000Z")).toBe(
      "2026-09-22T02:00:00.000Z",
    );
  });

  it("converts epoch millis", () => {
    expect(asSqlTimestamp(Date.UTC(2026, 8, 22, 2, 0, 0))).toBe(
      "2026-09-22T02:00:00.000Z",
    );
  });

  it("ISO string can be written by Buffer.utf8Write (postgres.js encoder)", () => {
    const buf = Buffer.alloc(64);
    const iso = asSqlTimestamp(new Date("2026-09-22T02:00:00.000Z"));
    expect(typeof iso).toBe("string");
    expect(() => buf.write(iso, 0, "utf8")).not.toThrow();
  });
});

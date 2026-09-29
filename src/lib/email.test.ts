import { describe, expect, it } from "vitest";
import { isValidEmail } from "./email";

describe("isValidEmail", () => {
  it("rejects an address with no domain ending", () => {
    expect(isValidEmail("iyaz@gmail")).toBe(false);
  });

  it("accepts a normal address", () => {
    expect(isValidEmail("iyaz@gmail.com")).toBe(true);
  });

  it("rejects a one-letter ending", () => {
    expect(isValidEmail("iyaz@gmail.c")).toBe(false);
  });
});

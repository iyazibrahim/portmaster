import { afterEach, describe, expect, it } from "vitest";
import { signItUnlock, verifyItUnlock } from "./it-settings-cookie";

describe("IT settings cookie", () => {
  const previous = process.env.AUTH_SECRET;

  afterEach(() => {
    if (previous == null) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  });

  it("rejects a forged future timestamp", () => {
    process.env.AUTH_SECRET = "test-secret";
    const forged = String(Date.now() + 60 * 60 * 1000);
    expect(verifyItUnlock(forged)).toBe(false);
  });

  it("accepts a signed unlock and rejects a tampered one", () => {
    process.env.AUTH_SECRET = "test-secret";
    const signed = signItUnlock();
    expect(verifyItUnlock(signed.value)).toBe(true);
    expect(verifyItUnlock(`${signed.value}x`)).toBe(false);
  });
});

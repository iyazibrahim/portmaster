import { afterEach, describe, expect, it } from "vitest";
import {
  _rateLimitClearForTests,
  _rateLimitStoreSizeForTests,
  rateLimit,
} from "./rate-limit";

afterEach(() => {
  _rateLimitClearForTests();
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    expect(rateLimit({ key: "a", limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit({ key: "a", limit: 2, windowMs: 60_000 }).ok).toBe(true);
    const blocked = rateLimit({ key: "a", limit: 2, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys separately", () => {
    rateLimit({ key: "x", limit: 1, windowMs: 60_000 });
    expect(rateLimit({ key: "y", limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(_rateLimitStoreSizeForTests()).toBe(2);
  });
});

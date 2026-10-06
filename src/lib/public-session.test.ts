import { describe, expect, it } from "vitest";
import { toPublicSession } from "./public-session";

describe("public session", () => {
  it("drops password hash, MyKad hash, and the raw session token", () => {
    const row = {
      id: "usr_1",
      name: "Farid",
      email: "fisher@tiangpass.local",
      image: null,
      role: "USER" as const,
      passwordHash: "$2a$12$secret",
      myKadHash: "abc",
      phone: "+6012",
      sessionToken: "raw-token",
    };
    const session = toPublicSession({
      expires: new Date("2026-10-07T00:00:00.000Z"),
      user: row,
    });
    expect(session.user).toEqual({
      id: "usr_1",
      name: "Farid",
      email: "fisher@tiangpass.local",
      image: null,
      role: "USER",
    });
    expect(session.expires).toBe("2026-10-07T00:00:00.000Z");
    expect(JSON.stringify(session)).not.toContain("passwordHash");
    expect(JSON.stringify(session)).not.toContain("myKadHash");
    expect(JSON.stringify(session)).not.toContain("raw-token");
    expect(JSON.stringify(session)).not.toContain("sessionToken");
  });
});

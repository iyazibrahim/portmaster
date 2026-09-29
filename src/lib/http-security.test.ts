import { describe, expect, it } from "vitest";
import {
  clientSafeMessage,
  httpsRedirectTarget,
  timingSafeEqualString,
} from "./http-security";

describe("timingSafeEqualString", () => {
  it("matches equal secrets and rejects others", () => {
    expect(timingSafeEqualString("cron-secret", "cron-secret")).toBe(true);
    expect(timingSafeEqualString("cron-secret", "other")).toBe(false);
  });
});

describe("clientSafeMessage", () => {
  it("keeps a short business message", () => {
    expect(clientSafeMessage(new Error("Pass is not awaiting payment."), "failed")).toBe(
      "Pass is not awaiting payment.",
    );
  });

  it("hides SQL and connection errors", () => {
    expect(
      clientSafeMessage(new Error("Failed query: select * from users"), "unavailable"),
    ).toBe("unavailable");
  });
});

describe("httpsRedirectTarget", () => {
  const prevApp = process.env.APP_URL;
  const prevAuth = process.env.AUTH_URL;

  function restore() {
    process.env.APP_URL = prevApp;
    process.env.AUTH_URL = prevAuth;
  }

  it("stays on HTTP for local development", () => {
    process.env.AUTH_URL = "";
    process.env.APP_URL = "http://127.0.0.1:43127";
    expect(
      httpsRedirectTarget({
        forwardedProto: "http",
        host: "127.0.0.1:43127",
        path: "/pass",
      }),
    ).toBeNull();
    restore();
  });

  it("rewrites to HTTPS when the public URL is HTTPS", () => {
    process.env.AUTH_URL = "";
    process.env.APP_URL = "https://tiangpass.example";
    expect(
      httpsRedirectTarget({
        forwardedProto: "http",
        host: "tiangpass.example",
        path: "/pass",
      }),
    ).toBe("https://tiangpass.example/pass");
    restore();
  });
});

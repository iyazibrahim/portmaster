import { createHash, randomBytes, timingSafeEqual } from "crypto";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
};

/** Password-reset link lifetime (1 hour). */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MINUTES = 60;

/** Min gap between reset emails for the same account (anti-spam / abuse). */
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

async function settingsMap() {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string
  >;
}

/** Cryptographically random URL-safe token (~256 bits). */
export function generateResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Constant-time compare of two hex digests. */
export function safeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length === 0 || ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function getAppBaseUrl(): Promise<string> {
  const map = await settingsMap();
  const override = map.app_url_override?.trim();
  if (override) return override.replace(/\/$/, "");
  const env =
    process.env.APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    "http://127.0.0.1:43127";
  return env.replace(/\/$/, "");
}

export async function getSupportEmail(): Promise<string | undefined> {
  const map = await settingsMap();
  const receipt = map.receipt_email?.trim();
  const support = map.support_email?.trim();
  return support || receipt || undefined;
}

export async function getSmtpConfig(): Promise<
  { ok: true; config: SmtpConfig } | { ok: false; error: string }
> {
  const map = await settingsMap();
  const host = map.smtp_host?.trim() ?? "";
  const user = map.smtp_user?.trim() ?? "";
  const pass = map.smtp_pass ?? "";
  const fromEmail = (map.smtp_from_email?.trim() || user).trim();
  const fromName = map.smtp_from_name?.trim() || "TiangPass";
  const portRaw = map.smtp_port?.trim() || "587";
  const port = Number(portRaw);
  const secureSetting = map.smtp_secure?.trim().toLowerCase();
  const secure =
    secureSetting === "true" ||
    secureSetting === "1" ||
    (!secureSetting && port === 465);

  if (!host) {
    return {
      ok: false,
      error: "SMTP host is not configured. Set it under Admin → Settings → IT.",
    };
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, error: "SMTP port must be a valid number (1–65535)." };
  }
  if (!fromEmail) {
    return {
      ok: false,
      error:
        "SMTP from email is required (or set SMTP user as the from address).",
    };
  }

  return {
    ok: true,
    config: { host, port, user, pass, fromEmail, fromName, secure },
  };
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const smtp = await getSmtpConfig();
  if (!smtp.ok) return smtp;

  const { config } = smtp;
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.pass }
        : undefined,
    });

    await transporter.sendMail({
      from: `"${config.fromName.replace(/"/g, "")}" <${config.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br/>"),
      headers: {
        "X-Entity-Ref-ID": randomBytes(8).toString("hex"),
      },
    });
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to send email via SMTP.";
    console.error("[smtp] sendMail", e);
    return { ok: false, error: message };
  }
}

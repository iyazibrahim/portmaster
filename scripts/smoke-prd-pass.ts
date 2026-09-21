/**
 * Server-side PRD smoke: create pass with jetty GPS → mock pay → operator CI/CO.
 * Run: npx tsx --env-file=.env scripts/smoke-prd-pass.ts
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/index";
import {
  handlers,
  jetties,
  locations,
  passes,
  passQrTokens,
  users,
} from "../src/db/schema";
import {
  createPassPendingPayment,
  mockPayPassSuccess,
  previewPassQrToken,
  scanPassQrToken,
} from "../src/lib/pass";

async function main() {
  const [fisher] = await db
    .select()
    .from(users)
    .where(eq(users.email, "fisher@tiangpass.local"))
    .limit(1);
  if (!fisher) throw new Error("fisher missing");

  const [handlerUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "handler@tiangpass.local"))
    .limit(1);
  if (!handlerUser) throw new Error("handler user missing");

  const [handler] = await db
    .select()
    .from(handlers)
    .where(eq(handlers.userId, handlerUser.id))
    .limit(1);
  if (!handler) throw new Error("handler row missing");

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, handler.jettyId))
    .limit(1);
  if (!jetty?.lat || !jetty.lng) throw new Error("handler jetty missing GPS");

  const [pillar] = await db
    .select()
    .from(locations)
    .where(
      and(eq(locations.jettyId, jetty.id), eq(locations.status, "AVAILABLE")),
    )
    .limit(1);
  if (!pillar) throw new Error("no AVAILABLE pillar");

  const todayPasses = await db
    .select()
    .from(passes)
    .where(eq(passes.userId, fisher.id));
  for (const p of todayPasses) {
    if (
      p.status === "PENDING_PAYMENT" ||
      p.status === "ACTIVE" ||
      p.status === "CHECKED_IN" ||
      p.status === "CHECKED_OUT"
    ) {
      await db
        .update(passes)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(passes.id, p.id));
    }
  }

  const hold = await createPassPendingPayment({
    userId: fisher.id,
    jettyId: jetty.id,
    pillarId: pillar.id,
    lat: jetty.lat,
    lng: jetty.lng,
  });
  console.log("hold", hold.passId, hold.reference);

  const paid = await mockPayPassSuccess(hold.passId, fisher.id);
  console.log("paid", paid.reference);

  const [qr] = await db
    .select()
    .from(passQrTokens)
    .where(eq(passQrTokens.passId, hold.passId))
    .limit(1);
  if (!qr) throw new Error("QR token missing");

  const preview = await previewPassQrToken(qr.token);
  console.log(
    "preview",
    preview?.anglerName,
    preview?.status,
    !!preview?.photoKey,
  );

  const ci = await scanPassQrToken({
    token: qr.token,
    actorUserId: handlerUser.id,
    actorRole: "HANDLER",
    handlerId: handler.id,
    lat: jetty.lat,
    lng: jetty.lng,
  });
  console.log("check_in", ci?.action, ci?.status);

  const co = await scanPassQrToken({
    token: qr.token,
    actorUserId: handlerUser.id,
    actorRole: "HANDLER",
    handlerId: handler.id,
    lat: jetty.lat,
    lng: jetty.lng,
  });
  console.log("check_out", co?.action, co?.status);

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@tiangpass.local"))
    .limit(1);
  if (!admin) throw new Error("admin missing");

  for (const p of await db
    .select()
    .from(passes)
    .where(eq(passes.userId, fisher.id))) {
    if (
      p.status === "PENDING_PAYMENT" ||
      p.status === "ACTIVE" ||
      p.status === "CHECKED_IN" ||
      p.status === "CHECKED_OUT"
    ) {
      await db
        .update(passes)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(passes.id, p.id));
    }
  }

  const hold2 = await createPassPendingPayment({
    userId: fisher.id,
    jettyId: jetty.id,
    pillarId: pillar.id,
    lat: jetty.lat,
    lng: jetty.lng,
  });
  await mockPayPassSuccess(hold2.passId, fisher.id);
  const [qr2] = await db
    .select()
    .from(passQrTokens)
    .where(eq(passQrTokens.passId, hold2.passId))
    .limit(1);
  if (!qr2) throw new Error("QR2 missing");

  const adminCi = await scanPassQrToken({
    token: qr2.token,
    actorUserId: admin.id,
    actorRole: "ADMIN",
    lat: "0",
    lng: "0",
  });
  console.log("admin_ci_bypass", adminCi?.action, adminCi?.status);

  console.log("SMOKE_PRD_PASS_OK");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

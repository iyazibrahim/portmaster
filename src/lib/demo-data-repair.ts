import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  boatOwners,
  boats,
  handlers,
  jetties,
  passes,
  scanEvents,
  settings,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { id, todayMYT } from "@/lib/utils-app";

const RAJ_REPAIR_KEY = "repair_raj_kumar_checkout_20261006";
const JURU_SLUG = "jeti-kuala-juru";
const JURU_EMAIL = "handler-juru@tiangpass.local";

let inflight: Promise<void> | null = null;

/** Once per process: close stale demo check-ins and ensure a Kuala Juru operator. */
export function repairDemoOpsData() {
  if (!inflight) {
    inflight = runRepair().catch((err) => {
      inflight = null;
      console.error("[demo-data-repair]", err);
    });
  }
  return inflight;
}

async function checkoutPasses(passIds: string[], note: string) {
  if (passIds.length === 0) return;
  const now = new Date();
  await db
    .update(passes)
    .set({
      status: "CHECKED_OUT",
      checkedOutAt: now,
      updatedAt: now,
    })
    .where(and(inArray(passes.id, passIds), eq(passes.status, "CHECKED_IN")));

  for (const passId of passIds) {
    const clientEventId = `repair_out_${passId}`.slice(0, 120);
    const [existing] = await db
      .select({ id: scanEvents.id })
      .from(scanEvents)
      .where(eq(scanEvents.clientEventId, clientEventId))
      .limit(1);
    if (existing) continue;
    await db.insert(scanEvents).values({
      id: id("scn"),
      passId,
      type: "CHECK_OUT",
      scannedAt: now,
      note,
      clientEventId,
    });
  }
}

async function closeStaleDemoCheckIns() {
  const today = todayMYT();
  const stale = await db
    .select({ id: passes.id })
    .from(passes)
    .innerJoin(users, eq(passes.userId, users.id))
    .where(
      and(
        eq(passes.status, "CHECKED_IN"),
        lt(passes.validOn, today),
        sql`lower(${users.email}) like '%@tiangpass.local'`,
      ),
    );
  await checkoutPasses(
    stale.map((row) => row.id),
    "Closed stale demo check-in",
  );
}

/**
 * Raj Kumar's tested pass stayed checked in after a failed live scan.
 * Seed check-ins have no scan event, so a fresh seed is left alone.
 * The settings flag stops a later real check-in from being closed again.
 */
async function closeRajKumarTestPass() {
  const [flag] = await db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, RAJ_REPAIR_KEY))
    .limit(1);
  if (flag) return;

  const rows = await db
    .select({ id: passes.id })
    .from(passes)
    .innerJoin(users, eq(passes.userId, users.id))
    .innerJoin(
      scanEvents,
      and(eq(scanEvents.passId, passes.id), eq(scanEvents.type, "CHECK_IN")),
    )
    .where(
      and(
        eq(users.email, "raj@tiangpass.local"),
        eq(passes.status, "CHECKED_IN"),
      ),
    );

  await checkoutPasses(
    [...new Set(rows.map((row) => row.id))],
    "Closed Raj Kumar pass left checked in",
  );

  const now = new Date();
  await db
    .insert(settings)
    .values({ key: RAJ_REPAIR_KEY, value: "done", updatedAt: now })
    .onConflictDoNothing();
}

async function ensureKualaJuruOperator() {
  const [jetty] = await db
    .select({ id: jetties.id })
    .from(jetties)
    .where(eq(jetties.slug, JURU_SLUG))
    .limit(1);
  if (!jetty) return;

  const [existing] = await db
    .select({ id: handlers.id })
    .from(handlers)
    .where(eq(handlers.jettyId, jetty.id))
    .limit(1);

  let handlerId = existing?.id;
  if (!handlerId) {
    const [owner] = await db
      .select({ id: boatOwners.id })
      .from(boatOwners)
      .where(eq(boatOwners.jettyId, jetty.id))
      .limit(1);

    let [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, JURU_EMAIL))
      .limit(1);
    if (!user) {
      const userId = id("usr");
      await db.insert(users).values({
        id: userId,
        name: "Juru Operator",
        email: JURU_EMAIL,
        passwordHash: await hashPassword("password123"),
        role: "HANDLER",
        phone: "+601100000019",
        citizenship: "MY",
      });
      user = { id: userId };
    } else {
      await db
        .update(users)
        .set({ role: "HANDLER" })
        .where(eq(users.id, user.id));
    }

    const [byUser] = await db
      .select({ id: handlers.id })
      .from(handlers)
      .where(eq(handlers.userId, user.id))
      .limit(1);
    if (byUser) {
      handlerId = byUser.id;
      await db
        .update(handlers)
        .set({
          jettyId: jetty.id,
          boatOwnerId: owner?.id ?? null,
          displayName: "Juru Operator",
        })
        .where(eq(handlers.id, byUser.id));
    } else {
      handlerId = id("hdl");
      await db.insert(handlers).values({
        id: handlerId,
        userId: user.id,
        jettyId: jetty.id,
        boatOwnerId: owner?.id ?? null,
        displayName: "Juru Operator",
        licenseNo: "PNG-H-1004",
      });
    }
  }

  await db
    .update(boats)
    .set({ handlerId })
    .where(eq(boats.jettyId, jetty.id));
}

async function runRepair() {
  await closeStaleDemoCheckIns();
  await closeRajKumarTestPass();
  await ensureKualaJuruOperator();
}

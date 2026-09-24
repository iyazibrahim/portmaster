import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  alerts,
  auditLogs,
  boatOwners,
  boatSeats,
  boats,
  handlers,
  incidents,
  jetties,
  locations,
  passQrTokens,
  passes,
  payments,
  pricingConfig,
  settings,
  users,
} from "./schema.ts";
import {
  hashMyKad,
  id,
  myKadLast4,
  todayMYT,
} from "../lib/utils-app.ts";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://tiangpass:tiangpass@127.0.0.1:5432/tiangpass";
const pg = postgres(connectionString, { max: 1, prepare: false });
const db = drizzle(pg);

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function layoutForCapacity(capacity: number): { label: string; row: number; col: number }[] {
  const seats: { label: string; row: number; col: number }[] = [];
  let remaining = capacity;
  let row = 0;
  let n = 1;
  while (remaining > 0) {
    const cols = remaining === 1 ? 1 : Math.min(2, remaining);
    if (cols === 1) {
      seats.push({ label: `S${n}`, row, col: 1 });
      n += 1;
      remaining -= 1;
    } else {
      seats.push({ label: `S${n}`, row, col: 0 });
      n += 1;
      seats.push({ label: `S${n}`, row, col: 2 });
      n += 1;
      remaining -= 2;
    }
    row += 1;
  }
  return seats;
}

/** Four boarding jetties around Jambatan Pulau Pinang — the only active corridor. */
const ACTIVE_JETTY_SEED: {
  name: string;
  area: string;
  slug: string;
  lat: string;
  lng: string;
  side: "GEORGETOWN" | "SEBERANG_PERAI";
  pillarStart: number;
  pillarCount: number;
  closedNumbers?: number[];
}[] = [
  {
    name: "Jeti Batu Uban, Bukit Gelugor",
    area: "Gelugor · Island, south of Jambatan Pulau Pinang",
    slug: "jeti-batu-uban-bukit-gelugor",
    lat: "5.3506",
    lng: "100.3135",
    side: "GEORGETOWN",
    pillarStart: 1,
    pillarCount: 8,
    closedNumbers: [7],
  },
  {
    name: "Jeti Nelayan Jelutong",
    area: "George Town · Island, north of Jambatan Pulau Pinang",
    slug: "jeti-nelayan-jelutong",
    lat: "5.3950",
    lng: "100.3178",
    side: "GEORGETOWN",
    pillarStart: 9,
    pillarCount: 8,
  },
  {
    name: "Jeti Bagan Dalam, Perai",
    area: "Perai · Mainland, north of Jambatan Pulau Pinang",
    slug: "jeti-bagan-dalam-perai",
    lat: "5.3832",
    lng: "100.3835",
    side: "SEBERANG_PERAI",
    pillarStart: 1,
    pillarCount: 8,
  },
  {
    name: "Jeti Kuala Juru",
    area: "Seberang Perai Tengah · Mainland, south of Jambatan Pulau Pinang",
    slug: "jeti-kuala-juru",
    lat: "5.3268",
    lng: "100.4165",
    side: "SEBERANG_PERAI",
    pillarStart: 9,
    pillarCount: 8,
  },
];

/** Other Penang landings — catalogued but inactive for MVP1. */
const INACTIVE_JETTY_SEED: { name: string; area: string }[] = [
  { name: "Kuala Bekah, Bertam", area: "Seberang Perai Utara" },
  { name: "Changkat, Nibong Tebal", area: "Seberang Perai Selatan" },
  { name: "Sungai Chenaam, Seberang Perai", area: "Seberang Perai" },
  { name: "Pantai Acheh", area: "Balik Pulau" },
  { name: "Pulau Betong (Jeti Nelayan Pulau Betong)", area: "Balik Pulau" },
  { name: "Kuala Sungai Teluk Bahang", area: "Teluk Bahang" },
  { name: "Tanjung Tokong", area: "George Town" },
  { name: "Sungai Pinang, Balik Pulau", area: "Balik Pulau" },
  { name: "Kg Labuh, Banting (Tasek Gelugor)", area: "Seberang Perai Utara" },
  { name: "Sungai Haji Ibrahim, Nibong Tebal", area: "Seberang Perai Selatan" },
  { name: "Kg Che Isa", area: "Seberang Perai" },
  { name: "Byram", area: "Seberang Perai Selatan" },
  { name: "Sungai Haji Din", area: "Seberang Perai" },
  { name: "Kg Teluk Ipil", area: "Seberang Perai" },
  { name: "Kg Kepala Batas", area: "Seberang Perai Utara" },
  { name: "Kuala Sungai Burung, Balik Pulau", area: "Balik Pulau" },
  { name: "Permatang Tepi Laut, Bayan Lepas", area: "Bayan Lepas" },
  { name: "Sungai Sembilang, Pantai Acheh", area: "Balik Pulau" },
  { name: "Penaga, Kepala Batas", area: "Seberang Perai Utara" },
  { name: "Sungai Tembus, Penaga", area: "Seberang Perai Utara" },
  { name: "Jeti Nelayan Changkat, Nibong Tebal", area: "Seberang Perai Selatan" },
  { name: "Jeti Nelayan Teluk Air Tawar", area: "Seberang Perai Utara" },
  { name: "Bukit Tambun, Batu Kawan", area: "Seberang Perai Selatan" },
  { name: "Jeti Nelayan Taman Ilmu, Nibong Tebal", area: "Seberang Perai Selatan" },
  { name: "Jeti Nelayan Kg Tengah, Changkat", area: "Seberang Perai Selatan" },
  { name: "Sungai Air Hitam (Unit Nelayan Sg Chenaam)", area: "Seberang Perai" },
  { name: "Jeti Kg Dato' Keramat, Nibong Tebal", area: "Seberang Perai Selatan" },
  { name: "Sungai Abdul, Teluk Air Tawar", area: "Seberang Perai Utara" },
  { name: "Sungai Semilang, Juru (pendaratan kerang)", area: "Seberang Perai Tengah" },
];

async function seed() {
  console.log("Seeding TiangPass (SRS MVP1)…");

  const {
    bookings,
    bookingSeats,
    bookingAccessTokens,
    scanEvents,
    sessions,
    accounts,
    reports,
    accountBlocks,
  } = await import("./schema.ts");

  await db.delete(scanEvents);
  await db.delete(passQrTokens);
  await db.delete(payments);
  await db.delete(passes);
  await db.delete(alerts);
  await db.delete(incidents);
  await db.delete(auditLogs);
  await db.delete(accountBlocks);
  await db.delete(bookingAccessTokens);
  await db.delete(bookingSeats);
  await db.delete(bookings);
  await db.delete(reports);
  await db.delete(boatSeats);
  await db.delete(boats);
  await db.delete(handlers);
  await db.delete(boatOwners);
  await db.delete(locations);
  await db.delete(jetties);
  await db.delete(pricingConfig);
  await db.delete(settings);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(users);

  const passwordHash = await bcrypt.hash("password123", 10);
  const itPasswordHash = await bcrypt.hash("it-settings-demo", 10);
  const now = new Date();

  const adminId = id("usr");
  const fisherId = id("usr");
  const fisher2Id = id("usr");
  const handlerUserId = id("usr");
  const handlerUser2Id = id("usr");
  const handlerUser3Id = id("usr");
  const llmId = id("usr");

  const fisherIc = "900101145678";
  const sitiIc = "950215089012";

  const extraAnglers = [
    { name: "Ahmad Faisal", email: "ahmad@tiangpass.local", ic: "880512071234", phone: "+601100000011" },
    { name: "Lim Wei Jie", email: "weijie@tiangpass.local", ic: "920818081111", phone: "+601100000012" },
    { name: "Nurul Izzah", email: "nurul@tiangpass.local", ic: "910304072222", phone: "+601100000013" },
    { name: "Raj Kumar", email: "raj@tiangpass.local", ic: "870920081333", phone: "+601100000014" },
    { name: "Tan Mei Ling", email: "meiling@tiangpass.local", ic: "940611082444", phone: "+601100000015" },
    { name: "Hafiz Rahman", email: "hafiz@tiangpass.local", ic: "890203073555", phone: "+601100000016" },
    { name: "Chong Kah Wai", email: "kahwai@tiangpass.local", ic: "930717084666", phone: "+601100000017" },
    { name: "Suresh Nair", email: "suresh@tiangpass.local", ic: "860128085777", phone: "+601100000018" },
  ] as const;
  const extraAnglerIds = extraAnglers.map(() => id("usr"));

  await db.insert(users).values([
    {
      id: adminId,
      name: "Amina Admin",
      email: "admin@tiangpass.local",
      passwordHash,
      role: "ADMIN",
      phone: "+601100000001",
      emergencyContact: "+601199900001",
      emergencyContactName: "Amina Next of Kin",
      address: "Georgetown, Penang",
      citizenship: "MY",
      dob: "1985-03-12",
      policyAcceptedAt: now,
      pdpaAcceptedAt: now,
      locationConsentAt: now,
    },
    {
      id: fisherId,
      name: "Farid Fisher",
      email: "fisher@tiangpass.local",
      passwordHash,
      role: "USER",
      phone: "+601100000002",
      emergencyContact: "+601199900002",
      emergencyContactName: "Farid Family",
      address: "Butterworth, Penang",
      myKadHash: hashMyKad(fisherIc),
      myKadLast4: myKadLast4(fisherIc),
      dob: "1990-01-01",
      citizenship: "MY",
      policyAcceptedAt: now,
      pdpaAcceptedAt: now,
      locationConsentAt: now,
    },
    {
      id: fisher2Id,
      name: "Siti Angler",
      email: "siti@tiangpass.local",
      passwordHash,
      role: "USER",
      phone: "+601100000003",
      emergencyContact: "+601199900003",
      emergencyContactName: "Siti Family",
      address: "Gelugor, Penang",
      myKadHash: hashMyKad(sitiIc),
      myKadLast4: myKadLast4(sitiIc),
      dob: "1995-02-15",
      citizenship: "MY",
      policyAcceptedAt: now,
      pdpaAcceptedAt: now,
      locationConsentAt: now,
    },
    {
      id: handlerUserId,
      name: "Hassan Handler",
      email: "handler@tiangpass.local",
      passwordHash,
      role: "HANDLER",
      phone: "+601100000004",
      citizenship: "MY",
    },
    {
      id: handlerUser2Id,
      name: "Mei Boatmaster",
      email: "handler2@tiangpass.local",
      passwordHash,
      role: "HANDLER",
      phone: "+601100000005",
      citizenship: "MY",
    },
    {
      id: handlerUser3Id,
      name: "Ravi Skipper",
      email: "handler3@tiangpass.local",
      passwordHash,
      role: "HANDLER",
      phone: "+601100000006",
      citizenship: "MY",
    },
    {
      id: llmId,
      name: "LLM Viewer",
      email: "llm@tiangpass.local",
      passwordHash,
      role: "LLM_VIEWER",
      phone: "+601100000007",
      citizenship: "MY",
      policyAcceptedAt: now,
    },
    ...extraAnglers.map((a, i) => ({
      id: extraAnglerIds[i]!,
      name: a.name,
      email: a.email,
      passwordHash,
      role: "USER" as const,
      phone: a.phone,
      emergencyContact: "+601199900009",
      emergencyContactName: "Emergency Contact",
      address: "Penang",
      myKadHash: hashMyKad(a.ic),
      myKadLast4: myKadLast4(a.ic),
      dob: `19${a.ic.slice(0, 2)}-${a.ic.slice(2, 4)}-${a.ic.slice(4, 6)}`,
      citizenship: "MY",
      policyAcceptedAt: now,
      pdpaAcceptedAt: now,
      locationConsentAt: now,
    })),
  ]);

  const jettyIdBySlug = new Map<string, string>();
  let sortOrder = 0;
  const jettyRows = [
    ...ACTIVE_JETTY_SEED.map((j) => {
      sortOrder += 1;
      const jettyId = id("jty");
      jettyIdBySlug.set(j.slug, jettyId);
      return {
        id: jettyId,
        name: j.name,
        area: j.area,
        slug: j.slug,
        active: true,
        notes: "Boarding jetty for authorised fishing under Jambatan Pulau Pinang.",
        sortOrder,
        lat: j.lat,
        lng: j.lng,
        geofenceRadiusM: 100,
        openTime: "06:00",
        closeTime: "18:00",
      };
    }),
    ...INACTIVE_JETTY_SEED.map((j) => {
      sortOrder += 1;
      const slug = slugify(j.name);
      const jettyId = id("jty");
      jettyIdBySlug.set(slug, jettyId);
      return {
        id: jettyId,
        name: j.name,
        area: j.area,
        slug,
        active: false,
        notes: "Outside the Jambatan Pulau Pinang corridor — disabled for MVP1.",
        sortOrder,
        lat: null,
        lng: null,
        geofenceRadiusM: 100,
        openTime: "06:00",
        closeTime: "18:00",
      };
    }),
  ];
  await db.insert(jetties).values(jettyRows);

  const batuUbanId = jettyIdBySlug.get("jeti-batu-uban-bukit-gelugor")!;
  const jelutongId = jettyIdBySlug.get("jeti-nelayan-jelutong")!;
  const peraiId = jettyIdBySlug.get("jeti-bagan-dalam-perai")!;
  const juruId = jettyIdBySlug.get("jeti-kuala-juru")!;

  const locationRows: {
    id: string;
    jettyId: string;
    number: number;
    side: "GEORGETOWN" | "SEBERANG_PERAI";
    name: string;
    status: "AVAILABLE" | "UNAVAILABLE";
    maxOccupancy: number;
    notes: string | null;
    tags: string | null;
  }[] = [];

  for (const def of ACTIVE_JETTY_SEED) {
    const jettyId = jettyIdBySlug.get(def.slug)!;
    const prefix = def.side === "GEORGETOWN" ? "GT" : "SP";
    const closed = new Set(def.closedNumbers ?? []);
    for (let n = def.pillarStart; n < def.pillarStart + def.pillarCount; n++) {
      const isClosed = closed.has(n);
      locationRows.push({
        id: id("loc"),
        jettyId,
        number: n,
        side: def.side,
        name: `${prefix} Pillar ${n}`,
        status: isClosed ? "UNAVAILABLE" : "AVAILABLE",
        maxOccupancy: 4,
        notes: isClosed
          ? "LLM maintenance closure"
          : `Authorised fishing under Jambatan Pulau Pinang · boarded at ${def.name}`,
        tags: n === def.pillarStart ? "demo" : null,
      });
    }
  }
  await db.insert(locations).values(locationRows);

  const ownerUser1Id = id("usr");
  const ownerUser2Id = id("usr");
  const ownerUser3Id = id("usr");
  const ownerUser4Id = id("usr");
  await db.insert(users).values([
    {
      id: ownerUser1Id,
      name: "Owner Merah",
      email: "owner1@tiangpass.local",
      passwordHash,
      role: "USER",
      phone: "+60121110001",
      citizenship: "MY",
    },
    {
      id: ownerUser2Id,
      name: "Owner Jelutong",
      email: "owner2@tiangpass.local",
      passwordHash,
      role: "USER",
      phone: "+60121110002",
      citizenship: "MY",
    },
    {
      id: ownerUser3Id,
      name: "Owner Perai",
      email: "owner3@tiangpass.local",
      passwordHash,
      role: "USER",
      phone: "+60121110003",
      citizenship: "MY",
    },
    {
      id: ownerUser4Id,
      name: "Owner Juru",
      email: "owner4@tiangpass.local",
      passwordHash,
      role: "USER",
      phone: "+60121110004",
      citizenship: "MY",
    },
  ]);

  const owner1Id = id("own");
  const owner2Id = id("own");
  const owner3Id = id("own");
  const owner4Id = id("own");
  await db.insert(boatOwners).values([
    {
      id: owner1Id,
      userId: ownerUser1Id,
      jettyId: batuUbanId,
      name: "Syarikat Bot Merah",
      contactPhone: "+60121110001",
      myKadLast4: "0001",
      active: true,
    },
    {
      id: owner2Id,
      userId: ownerUser2Id,
      jettyId: jelutongId,
      name: "Bot Nelayan Jelutong",
      contactPhone: "+60121110002",
      myKadLast4: "0002",
      active: true,
    },
    {
      id: owner3Id,
      userId: ownerUser3Id,
      jettyId: peraiId,
      name: "Kumpulan Laut Perai",
      contactPhone: "+60121110003",
      myKadLast4: "0003",
      active: true,
    },
    {
      id: owner4Id,
      userId: ownerUser4Id,
      jettyId: juruId,
      name: "Nelayan Kuala Juru",
      contactPhone: "+60121110004",
      myKadLast4: "0004",
      active: true,
    },
  ]);

  const handler1Id = id("hdl");
  const handler2Id = id("hdl");
  const handler3Id = id("hdl");

  await db.insert(handlers).values([
    {
      id: handler1Id,
      userId: handlerUserId,
      jettyId: batuUbanId,
      boatOwnerId: owner1Id,
      displayName: "Hassan Batu Uban",
      licenseNo: "PNG-H-1001",
      mockEarningsCents: 0,
    },
    {
      id: handler2Id,
      userId: handlerUser2Id,
      jettyId: jelutongId,
      boatOwnerId: owner2Id,
      displayName: "Mei Jelutong",
      licenseNo: "PNG-H-1002",
      mockEarningsCents: 0,
    },
    {
      id: handler3Id,
      userId: handlerUser3Id,
      jettyId: peraiId,
      boatOwnerId: owner3Id,
      displayName: "Ravi Perai",
      licenseNo: "PNG-H-1003",
      mockEarningsCents: 0,
    },
  ]);

  const permit = new Date();
  permit.setFullYear(permit.getFullYear() + 1);

  const boatDefs = [
    { handlerId: handler1Id, ownerId: owner1Id, jettyId: batuUbanId, name: "Sampan Merah", registration: "PNG-BM-101", capacity: 6 },
    { handlerId: handler1Id, ownerId: owner1Id, jettyId: batuUbanId, name: "Kepala Laut", registration: "PNG-BM-102", capacity: 8 },
    { handlerId: handler1Id, ownerId: owner1Id, jettyId: batuUbanId, name: "Ombak Biru", registration: "PNG-BM-103", capacity: 6 },
    { handlerId: handler2Id, ownerId: owner2Id, jettyId: jelutongId, name: "Angin Timur", registration: "PNG-JL-201", capacity: 4 },
    { handlerId: handler2Id, ownerId: owner2Id, jettyId: jelutongId, name: "Jeti Biru", registration: "PNG-JL-202", capacity: 10 },
    { handlerId: handler3Id, ownerId: owner3Id, jettyId: peraiId, name: "Selatan 1", registration: "PNG-PR-301", capacity: 10 },
    { handlerId: handler3Id, ownerId: owner3Id, jettyId: peraiId, name: "Selatan 2", registration: "PNG-PR-302", capacity: 8 },
    { handlerId: handler3Id, ownerId: owner4Id, jettyId: juruId, name: "Juru Express", registration: "PNG-JR-401", capacity: 6 },
    { handlerId: handler3Id, ownerId: owner4Id, jettyId: juruId, name: "Kerang Star", registration: "PNG-JR-402", capacity: 8 },
    { handlerId: handler2Id, ownerId: owner2Id, jettyId: jelutongId, name: "Gelugor Star", registration: "PNG-JL-203", capacity: 8, active: false },
  ] as const;

  const boatIdByName = new Map<string, string>();
  let boatCount = 0;
  for (const def of boatDefs) {
    const boatId = id("bot");
    boatIdByName.set(def.name, boatId);
    await db.insert(boats).values({
      id: boatId,
      handlerId: def.handlerId,
      ownerId: def.ownerId,
      jettyId: def.jettyId,
      name: def.name,
      registration: def.registration,
      capacity: def.capacity,
      status: "active" in def && def.active === false ? "INACTIVE" : "ACTIVE",
      active: "active" in def ? def.active !== false : true,
      permitExpiresAt: permit,
      pricePerPersonCents: 0,
    });
    boatCount += 1;
    const layout = layoutForCapacity(def.capacity);
    await db.insert(boatSeats).values(
      layout.map((s) => ({
        id: id("seat"),
        boatId,
        label: s.label,
        row: s.row,
        col: s.col,
        blocked: false,
      })),
    );
  }

  const pillarsFor = (jettyId: string) =>
    locationRows.filter((l) => l.jettyId === jettyId && l.status === "AVAILABLE");
  const batuUbanPillars = pillarsFor(batuUbanId);
  const jelutongPillars = pillarsFor(jelutongId);
  const peraiPillars = pillarsFor(peraiId);
  const juruPillars = pillarsFor(juruId);

  const validOn = todayMYT();
  let passSeq = 0;

  async function seedPass(opts: {
    userId: string;
    jettyId: string;
    pillarId: string;
    boatOwnerId: string;
    boatId?: string;
    status: "ACTIVE" | "CHECKED_IN" | "CHECKED_OUT";
    activatedAgoMs: number;
    checkedInAgoMs?: number;
    checkedOutAgoMs?: number;
    day?: string;
    qr?: string;
  }) {
    passSeq += 1;
    const day = opts.day ?? validOn;
    const passId = id("pas");
    const activatedAt = new Date(Date.now() - opts.activatedAgoMs);
    const checkedInAt =
      opts.checkedInAgoMs != null
        ? new Date(Date.now() - opts.checkedInAgoMs)
        : null;
    const checkedOutAt =
      opts.checkedOutAgoMs != null
        ? new Date(Date.now() - opts.checkedOutAgoMs)
        : null;
    await db.insert(passes).values({
      id: passId,
      reference: `PM-${day.replace(/-/g, "")}-D${String(passSeq).padStart(2, "0")}`,
      userId: opts.userId,
      jettyId: opts.jettyId,
      pillarId: opts.pillarId,
      boatOwnerId: opts.boatOwnerId,
      boatId: opts.boatId ?? null,
      validOn: day,
      status: opts.status,
      feeCents: 500,
      activatedAt,
      checkedInAt,
      checkedOutAt,
    });
    await db.insert(payments).values({
      id: id("pay"),
      passId,
      amountCents: 500,
      status: "PAID",
      mockRef: `MOCK-D${String(passSeq).padStart(2, "0")}`,
      provider: "mock",
      paidAt: activatedAt,
    });
    if (opts.status === "CHECKED_IN" || opts.status === "CHECKED_OUT") {
      await db.insert(passQrTokens).values({
        id: id("pqr"),
        passId,
        token: opts.qr ?? `demo-qr-${passSeq}`,
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999)),
      });
    }
    return passId;
  }

  await seedPass({
    userId: fisher2Id,
    jettyId: batuUbanId,
    pillarId: batuUbanPillars[0]!.id,
    boatOwnerId: owner1Id,
    boatId: boatIdByName.get("Sampan Merah"),
    status: "CHECKED_IN",
    activatedAgoMs: 4 * 3600_000,
    checkedInAgoMs: 3.5 * 3600_000,
    qr: "demo-qr-token-siti-checked-in",
  });
  await seedPass({
    userId: extraAnglerIds[0]!,
    jettyId: batuUbanId,
    pillarId: batuUbanPillars[0]!.id,
    boatOwnerId: owner1Id,
    boatId: boatIdByName.get("Sampan Merah"),
    status: "CHECKED_IN",
    activatedAgoMs: 5 * 3600_000,
    checkedInAgoMs: 4.5 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[1]!,
    jettyId: jelutongId,
    pillarId: jelutongPillars[0]!.id,
    boatOwnerId: owner2Id,
    boatId: boatIdByName.get("Angin Timur"),
    status: "CHECKED_IN",
    activatedAgoMs: 3 * 3600_000,
    checkedInAgoMs: 2.5 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[2]!,
    jettyId: jelutongId,
    pillarId: jelutongPillars[1]!.id,
    boatOwnerId: owner2Id,
    boatId: boatIdByName.get("Jeti Biru"),
    status: "CHECKED_IN",
    activatedAgoMs: 6 * 3600_000,
    checkedInAgoMs: 5.5 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[3]!,
    jettyId: peraiId,
    pillarId: peraiPillars[0]!.id,
    boatOwnerId: owner3Id,
    boatId: boatIdByName.get("Selatan 1"),
    status: "CHECKED_IN",
    activatedAgoMs: 9.5 * 3600_000,
    checkedInAgoMs: 9.2 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[4]!,
    jettyId: peraiId,
    pillarId: peraiPillars[2]!.id,
    boatOwnerId: owner3Id,
    boatId: boatIdByName.get("Selatan 2"),
    status: "CHECKED_OUT",
    activatedAgoMs: 7 * 3600_000,
    checkedInAgoMs: 6.5 * 3600_000,
    checkedOutAgoMs: 1.5 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[5]!,
    jettyId: juruId,
    pillarId: juruPillars[0]!.id,
    boatOwnerId: owner4Id,
    boatId: boatIdByName.get("Juru Express"),
    status: "CHECKED_IN",
    activatedAgoMs: 2 * 3600_000,
    checkedInAgoMs: 1.5 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[6]!,
    jettyId: juruId,
    pillarId: juruPillars[1]!.id,
    boatOwnerId: owner4Id,
    boatId: boatIdByName.get("Kerang Star"),
    status: "CHECKED_OUT",
    activatedAgoMs: 8 * 3600_000,
    checkedInAgoMs: 7.5 * 3600_000,
    checkedOutAgoMs: 2 * 3600_000,
  });
  await seedPass({
    userId: extraAnglerIds[7]!,
    jettyId: batuUbanId,
    pillarId: batuUbanPillars[2]!.id,
    boatOwnerId: owner1Id,
    status: "ACTIVE",
    activatedAgoMs: 40 * 60_000,
  });

  const yesterday = todayMYT(new Date(Date.now() - 24 * 3600_000));
  await seedPass({
    userId: extraAnglerIds[4]!,
    jettyId: batuUbanId,
    pillarId: batuUbanPillars[3]!.id,
    boatOwnerId: owner1Id,
    status: "CHECKED_OUT",
    activatedAgoMs: 28 * 3600_000,
    checkedInAgoMs: 26 * 3600_000,
    checkedOutAgoMs: 20 * 3600_000,
    day: yesterday,
  });

  await db.insert(alerts).values([
    {
      id: id("alt"),
      type: "Boat",
      severity: "WARNING",
      title: "Ombak Biru late return (Batu Uban)",
      description: "Boat PNG-BM-103 has not reported back from GT pillars.",
    },
    {
      id: id("alt"),
      type: "Angler",
      severity: "WARNING",
      title: `Angler overdue (SP Pillar ${peraiPillars[0]!.number})`,
      description: "Checked in more than 8 hours — follow up with operator Ravi Perai.",
    },
    {
      id: id("alt"),
      type: "System",
      severity: "INFO",
      title: "Payment mock mode active",
      description: "No live gateway configured",
    },
  ]);

  await db.insert(incidents).values({
    id: id("inc"),
    type: "Medical",
    description: `Angler unwell at ${batuUbanPillars[0]!.name} (Batu Uban boarding)`,
    status: "IN_PROGRESS",
    pillarId: batuUbanPillars[0]!.id,
  });

  await db.insert(pricingConfig).values([
    {
      id: id("prc"),
      key: "association_fee",
      valueCents: 500,
      label: "Association fee (MYR)",
    },
  ]);

  await db.insert(settings).values([
    { key: "support_phone", value: "+60123456789" },
    { key: "association_fee_cents", value: "500" },
    { key: "reservation_minutes", value: "10" },
    { key: "overdue_hours", value: "8" },
    { key: "default_geofence_radius_m", value: "100" },
    { key: "require_jetty_geofence", value: "true" },
    { key: "payment_gateway", value: "stripe" },
    { key: "it_settings_password_hash", value: itPasswordHash },
    { key: "qr_token_ttl_hours", value: "24" },
    { key: "maintenance_banner_on", value: "false" },
    { key: "maintenance_banner_text", value: "" },
    { key: "receipt_org_name", value: "TiangPass" },
    {
      key: "receipt_tagline",
      value: "Penang Bridge fishing association pass",
    },
    {
      key: "receipt_address",
      value: "Penang Bridge corridor jetties\nPulau Pinang, Malaysia",
    },
    { key: "receipt_reg_no", value: "" },
    { key: "receipt_phone", value: "+60123456789" },
    { key: "receipt_email", value: "ops@tiangpass.local" },
    {
      key: "receipt_footer",
      value:
        "Association fee · non-refundable. Show boarding QR at the jetty for check-in / check-out.",
    },
    { key: "receipt_logo_key", value: "" },
  ]);

  const activeCount = jettyRows.filter((j) => j.active).length;
  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log("  admin@tiangpass.local");
  console.log("  fisher@tiangpass.local");
  console.log("  siti@tiangpass.local (Checked-In at Batu Uban)");
  console.log("  handler@tiangpass.local / handler2@ / handler3@");
  console.log("  llm@tiangpass.local");
  console.log(`  Jetties: ${jettyRows.length} (${activeCount} active near Jambatan Pulau Pinang)`);
  console.log(`  Locations/pillars: ${locationRows.length}`);
  console.log(`  Boat owners: 4`);
  console.log(`  Boats: ${boatCount}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

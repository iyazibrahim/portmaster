import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  boatSeats,
  boats,
  handlers,
  jetties,
  locations,
  pricingConfig,
  settings,
  users,
} from "./schema";
import { id } from "../lib/utils-app";

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

/** Seed list B — ~33 Penang fishing / nelayan jetties (plan-locked). */
const JETTY_SEED: {
  name: string;
  area: string;
  slug?: string;
  rich?: boolean;
  berths?: number;
}[] = [
  { name: "Kuala Bekah, Bertam", area: "Seberang Perai Utara", berths: 3 },
  { name: "Changkat, Nibong Tebal", area: "Seberang Perai Selatan", berths: 3 },
  { name: "Sungai Chenaam, Seberang Perai", area: "Seberang Perai", berths: 4 },
  { name: "Pantai Acheh", area: "Balik Pulau", berths: 3 },
  { name: "Pulau Betong (Jeti Nelayan Pulau Betong)", area: "Balik Pulau", berths: 3 },
  { name: "Kuala Sungai Teluk Bahang", area: "Teluk Bahang", berths: 3 },
  { name: "Tanjung Tokong", area: "George Town", berths: 4 },
  { name: "Sungai Pinang, Balik Pulau", area: "Balik Pulau", berths: 3 },
  { name: "Kg Labuh, Banting (Tasek Gelugor)", area: "Seberang Perai Utara", berths: 3 },
  { name: "Sungai Haji Ibrahim, Nibong Tebal", area: "Seberang Perai Selatan", berths: 3 },
  { name: "Juru (Kuala Juru / pendaratan kerang)", area: "Seberang Perai Tengah", berths: 4 },
  { name: "Kg Che Isa", area: "Seberang Perai", berths: 2 },
  { name: "Byram", area: "Seberang Perai Selatan", berths: 3 },
  { name: "Sungai Haji Din", area: "Seberang Perai", berths: 2 },
  { name: "Kg Teluk Ipil", area: "Seberang Perai", berths: 2 },
  { name: "Kg Kepala Batas", area: "Seberang Perai Utara", berths: 3 },
  { name: "Jeti Batu Uban, Bukit Gelugor", area: "George Town", berths: 4 },
  { name: "Kuala Sungai Burung, Balik Pulau", area: "Balik Pulau", berths: 3 },
  { name: "Permatang Tepi Laut, Bayan Lepas", area: "Bayan Lepas", berths: 3 },
  { name: "Sungai Sembilang, Pantai Acheh", area: "Balik Pulau", berths: 2 },
  { name: "Penaga, Kepala Batas", area: "Seberang Perai Utara", berths: 3 },
  { name: "Sungai Tembus, Penaga", area: "Seberang Perai Utara", berths: 2 },
  { name: "Jeti Nelayan Jelutong", area: "George Town", berths: 4 },
  { name: "Jeti Nelayan Changkat, Nibong Tebal", area: "Seberang Perai Selatan", berths: 3 },
  { name: "Jeti Nelayan Teluk Air Tawar", area: "Seberang Perai Utara", berths: 3 },
  { name: "Bukit Tambun, Batu Kawan", area: "Seberang Perai Selatan", berths: 3 },
  { name: "Jeti Nelayan Taman Ilmu, Nibong Tebal", area: "Seberang Perai Selatan", berths: 2 },
  { name: "Jeti Nelayan Kg Tengah, Changkat", area: "Seberang Perai Selatan", berths: 2 },
  { name: "Sungai Air Hitam (Unit Nelayan Sg Chenaam)", area: "Seberang Perai", berths: 3 },
  { name: "Jeti Kg Dato' Keramat, Nibong Tebal", area: "Seberang Perai Selatan", berths: 2 },
  { name: "Sungai Abdul, Teluk Air Tawar", area: "Seberang Perai Utara", berths: 2 },
  { name: "Sungai Semilang, Juru (pendaratan kerang)", area: "Seberang Perai Tengah", berths: 3 },
  {
    name: "Penang Bridge Fishing",
    area: "Penang Bridge",
    slug: "penang-bridge-fishing",
    rich: true,
  },
];

async function seed() {
  console.log("Seeding PortMaster…");

  const {
    bookings,
    bookingSeats,
    payments,
    bookingAccessTokens,
    scanEvents,
    sessions,
    accounts,
    reports,
  } = await import("./schema");

  await db.delete(scanEvents);
  await db.delete(bookingAccessTokens);
  await db.delete(bookingSeats);
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(reports);
  await db.delete(boatSeats);
  await db.delete(boats);
  await db.delete(handlers);
  await db.delete(locations);
  await db.delete(jetties);
  await db.delete(pricingConfig);
  await db.delete(settings);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(users);

  const passwordHash = await bcrypt.hash("password123", 10);
  const itPasswordHash = await bcrypt.hash("it-settings-demo", 10);

  const adminId = id("usr");
  const fisherId = id("usr");
  const fisher2Id = id("usr");
  const handlerUserId = id("usr");
  const handlerUser2Id = id("usr");

  await db.insert(users).values([
    {
      id: adminId,
      name: "Amina Admin",
      email: "admin@portmaster.local",
      passwordHash,
      role: "ADMIN",
      phone: "+601100000001",
      emergencyContact: "+601199900001",
      policyAcceptedAt: new Date(),
    },
    {
      id: fisherId,
      name: "Farid Fisher",
      email: "fisher@portmaster.local",
      passwordHash,
      role: "USER",
      phone: "+601100000002",
      emergencyContact: "+601199900002",
      policyAcceptedAt: new Date(),
    },
    {
      id: fisher2Id,
      name: "Siti Angler",
      email: "siti@portmaster.local",
      passwordHash,
      role: "USER",
      phone: "+601100000003",
      emergencyContact: "+601199900003",
      policyAcceptedAt: new Date(),
    },
    {
      id: handlerUserId,
      name: "Hassan Handler",
      email: "handler@portmaster.local",
      passwordHash,
      role: "HANDLER",
      phone: "+601100000004",
    },
    {
      id: handlerUser2Id,
      name: "Mei Boatmaster",
      email: "handler2@portmaster.local",
      passwordHash,
      role: "HANDLER",
      phone: "+601100000005",
    },
  ]);

  const jettyIdBySlug = new Map<string, string>();
  const jettyRows = JETTY_SEED.map((j, i) => {
    const slug = j.slug ?? slugify(j.name);
    const jettyId = id("jty");
    jettyIdBySlug.set(slug, jettyId);
    return {
      id: jettyId,
      name: j.name,
      area: j.area,
      slug,
      active: true,
      notes: j.rich ? "Bridge pillar locations (85 per side)" : null,
      sortOrder: i + 1,
    };
  });
  await db.insert(jetties).values(jettyRows);

  const bridgeJettyId = jettyIdBySlug.get("penang-bridge-fishing")!;
  const batuUbanJettyId = jettyIdBySlug.get(
    slugify("Jeti Batu Uban, Bukit Gelugor"),
  )!;

  const locationRows: {
    id: string;
    jettyId: string;
    number: number;
    side: "GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL";
    name: string;
    status: "OPEN" | "CLOSED";
    notes: string | null;
    tags: string | null;
  }[] = [];

  for (const def of JETTY_SEED) {
    const slug = def.slug ?? slugify(def.name);
    const jettyId = jettyIdBySlug.get(slug)!;
    if (def.rich) {
      for (const side of ["GEORGETOWN", "SEBERANG_PERAI"] as const) {
        const sideShort = side === "GEORGETOWN" ? "GT" : "SP";
        for (let n = 1; n <= 85; n++) {
          locationRows.push({
            id: id("loc"),
            jettyId,
            number: n,
            side,
            name: `${sideShort} Location ${n}`,
            status: n % 17 === 0 ? "CLOSED" : "OPEN",
            notes: n % 17 === 0 ? "Maintenance / closed by admin" : null,
            tags: n <= 10 ? "popular" : null,
          });
        }
      }
    } else {
      const berths = def.berths ?? 3;
      locationRows.push({
        id: id("loc"),
        jettyId,
        number: 1,
        side: "GENERAL",
        name: "Main landing",
        status: "OPEN",
        notes: null,
        tags: "landing",
      });
      for (let n = 1; n <= berths; n++) {
        locationRows.push({
          id: id("loc"),
          jettyId,
          number: n + 1,
          side: "GENERAL",
          name: `Berth ${n}`,
          status: n === berths && berths > 2 ? "CLOSED" : "OPEN",
          notes: n === berths && berths > 2 ? "Reserved for net repair" : null,
          tags: null,
        });
      }
    }
  }
  await db.insert(locations).values(locationRows);

  const handler1Id = id("hdl");
  const handler2Id = id("hdl");

  await db.insert(handlers).values([
    {
      id: handler1Id,
      userId: handlerUserId,
      jettyId: bridgeJettyId,
      displayName: "Hassan Bridge Ops",
      licenseNo: "PNG-H-1001",
      mockEarningsCents: 0,
    },
    {
      id: handler2Id,
      userId: handlerUser2Id,
      jettyId: batuUbanJettyId,
      displayName: "Mei Batu Uban",
      licenseNo: "PNG-H-1002",
      mockEarningsCents: 0,
    },
  ]);

  const boatDefs = [
    {
      handlerId: handler1Id,
      name: "Sampan Merah",
      registration: "PNG-BM-101",
      capacity: 6,
      price: 4500,
    },
    {
      handlerId: handler1Id,
      name: "Kepala Laut",
      registration: "PNG-BM-102",
      capacity: 12,
      price: 5000,
    },
    {
      handlerId: handler2Id,
      name: "Angin Timur",
      registration: "PNG-BM-201",
      capacity: 4,
      price: 5500,
    },
    {
      handlerId: handler2Id,
      name: "Jeti Biru",
      registration: "PNG-BM-202",
      capacity: 10,
      price: 4000,
    },
  ];

  for (const def of boatDefs) {
    const boatId = id("bot");
    await db.insert(boats).values({
      id: boatId,
      handlerId: def.handlerId,
      name: def.name,
      registration: def.registration,
      capacity: def.capacity,
      active: true,
      pricePerPersonCents: def.price,
    });
    const layout = layoutForCapacity(def.capacity);
    await db.insert(boatSeats).values(
      layout.map((s, idx) => ({
        id: id("seat"),
        boatId,
        label: s.label,
        row: s.row,
        col: s.col,
        blocked: def.capacity === 10 && idx === layout.length - 1,
      })),
    );
  }

  await db.insert(pricingConfig).values([
    {
      id: id("prc"),
      key: "default_per_person",
      valueCents: 5000,
      label: "Default per-person (MYR)",
    },
    {
      id: id("prc"),
      key: "handler_share_bps",
      valueCents: 8000,
      label: "Handler share (basis points / 100 = %)",
    },
  ]);

  await db.insert(settings).values([
    { key: "support_phone", value: "+60123456789" },
    { key: "support_whatsapp", value: "+60123456789" },
    {
      key: "booking_window_copy",
      value: "Bookings open 48 hours ahead. Cut-off is 2 hours before slot start.",
    },
    { key: "platform_commission_pct", value: "20" },
    { key: "location_side_labels", value: "Georgetown|Seberang Perai|General" },
    { key: "default_party_size_max", value: "6" },
    { key: "maintenance_banner_on", value: "false" },
    { key: "maintenance_banner_text", value: "" },
    { key: "it_settings_password_hash", value: itPasswordHash },
    { key: "qr_token_ttl_hours", value: "48" },
    { key: "payment_gateway_api_url", value: "https://mock-pay.portmaster.local" },
    { key: "payment_gateway_key", value: "pk_mock_demo_key" },
    { key: "smtp_host", value: "smtp.example.local" },
    { key: "smtp_user", value: "ops@portmaster.local" },
    { key: "smtp_pass", value: "smtp-demo-pass" },
    { key: "webhook_secret", value: "whsec_demo_secret" },
    { key: "app_url_override", value: "" },
  ]);

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log("  admin@portmaster.local");
  console.log("  fisher@portmaster.local");
  console.log("  handler@portmaster.local (Penang Bridge Fishing)");
  console.log("  handler2@portmaster.local (Jeti Batu Uban)");
  console.log("IT settings password: it-settings-demo");
  console.log(`  Jetties: ${jettyRows.length}`);
  console.log(`  Locations: ${locationRows.length}`);
  console.log(`  Boats: ${boatDefs.length}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

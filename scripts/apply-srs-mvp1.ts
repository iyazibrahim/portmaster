/**
 * Applies schema SQL for a fresh or existing Postgres 16 database.
 * Usage: npx tsx --env-file=.env scripts/apply-srs-mvp1.ts
 * Docker / Dokploy boot: node --experimental-strip-types scripts/apply-srs-mvp1.ts
 *
 * Order: baseline 0000 + jetties 0002, then additive 0004–0009.
 * Skip 0001 (legacy tiangs rename) and 0003 (legacy trip groups).
 *
 * Optional: CLEAR_LEGACY_PAYMENTS=1 to wipe old booking payments (one-time upgrade).
 *
 * Important: postgres.js does not reliably run multi-statement strings in one
 * unsafe() call — we split on statement boundaries (including DO $$ … END $$;).
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";

/** Split SQL into executable statements, keeping DO $$ blocks intact. */
export function splitSqlStatements(sqlText: string): string[] {
  const withoutLineComments = sqlText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) return "";
      return line;
    })
    .join("\n");

  const statements: string[] = [];
  let buf = "";
  let i = 0;
  let inDollar = false;

  while (i < withoutLineComments.length) {
    const ch = withoutLineComments[i];
    const next = withoutLineComments[i + 1];

    if (!inDollar && ch === "$" && next === "$") {
      inDollar = true;
      buf += "$$";
      i += 2;
      continue;
    }
    if (inDollar && ch === "$" && next === "$") {
      inDollar = false;
      buf += "$$";
      i += 2;
      continue;
    }

    if (!inDollar && ch === ";") {
      const stmt = buf.trim();
      if (stmt.length > 0) statements.push(stmt);
      buf = "";
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const tail = buf.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

function isIgnorableSqlError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  if (
    code === "42P07" || // duplicate_table
    code === "42710" || // duplicate_object
    code === "42701" // duplicate_column
  ) {
    return true;
  }
  return (
    /already exists/i.test(msg) ||
    /duplicate_object/i.test(msg) ||
    /duplicate column/i.test(msg) ||
    /multiple primary keys/i.test(msg)
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = postgres(url, { max: 1, prepare: false });

  if (process.env.CLEAR_LEGACY_PAYMENTS === "1") {
    console.log("CLEAR_LEGACY_PAYMENTS=1 — wiping legacy booking payment rows…");
    for (const q of [
      `DELETE FROM scan_events`,
      `DELETE FROM booking_access_tokens`,
      `DELETE FROM booking_seats`,
      `DELETE FROM payments`,
      `DELETE FROM bookings`,
    ]) {
      try {
        await sql.unsafe(q);
      } catch {
        // table may not exist
      }
    }
  }

  const migrationPaths = [
    resolve("drizzle/0000_lively_namora.sql"),
    resolve("drizzle/0002_multi_jetty.sql"),
    resolve("drizzle/0004_srs_mvp1.sql"),
    resolve("drizzle/0005_prd_alignment.sql"),
    resolve("drizzle/0006_jetty_radius_100.sql"),
    resolve("drizzle/0007_emergency_contact_name.sql"),
    resolve("drizzle/0008_scan_client_event_id.sql"),
    resolve("drizzle/0009_overnight_intention.sql"),
  ];

  for (const migrationPath of migrationPaths) {
    let migration: string;
    try {
      migration = readFileSync(migrationPath, "utf8");
    } catch {
      console.warn(`Skip missing migration: ${migrationPath}`);
      continue;
    }
    const statements = splitSqlStatements(migration);
    console.log(`Applying ${migrationPath} (${statements.length} statements)…`);

    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
      } catch (err) {
        if (isIgnorableSqlError(err)) continue;
        console.error("Failed statement:\n", stmt.slice(0, 200), "…");
        throw err;
      }
    }
  }

  const check = await sql`
    select
      to_regclass('public.users') is not null as users,
      to_regclass('public.jetties') is not null as jetties,
      to_regclass('public.passes') is not null as passes
  `;
  const row = check[0];
  if (!row?.users || !row?.jetties || !row?.passes) {
    throw new Error(
      `Schema apply incomplete (users=${row?.users} jetties=${row?.jetties} passes=${row?.passes}).`,
    );
  }

  await sql.end();
  console.log('Schema applied. Tables "users", "jetties", and "passes" are present.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

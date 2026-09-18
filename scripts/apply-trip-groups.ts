import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { max: 1 });
  const migration = readFileSync(
    resolve("drizzle/0003_trip_groups.sql"),
    "utf8",
  );
  await sql.unsafe(migration);
  await sql.end();
  console.log("Applied drizzle/0003_trip_groups.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

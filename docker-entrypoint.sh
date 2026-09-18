#!/bin/sh
set -e

echo "Applying database schema..."
npx drizzle-kit push --force

echo "Checking whether demo data is needed..."
USER_COUNT=$(node --input-type=module -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const rows = await sql\`select count(*)::int as c from users\`;
console.log(rows[0].c);
await sql.end({ timeout: 2 });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding demo data..."
  npx tsx src/db/seed.ts
else
  echo "Database already has $USER_COUNT users; skipping seed."
fi

echo "Starting PortMaster..."
exec npm run start

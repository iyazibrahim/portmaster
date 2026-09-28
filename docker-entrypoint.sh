#!/bin/sh
set -e

# Named volume mounts as root; app runs as nextjs (uid 1001).
mkdir -p /app/data/photos
chown -R nextjs:nodejs /app/data/photos

run_as_app() {
  runuser -u nextjs -- "$@"
}

echo "Applying database schema..."
run_as_app node --experimental-strip-types ./scripts/apply-srs-mvp1.ts

echo "Checking whether demo data is needed..."
USER_COUNT=$(run_as_app node --input-type=module -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const rows = await sql\`select count(*)::int as c from users\`;
console.log(rows[0].c);
await sql.end({ timeout: 2 });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding demo data..."
  run_as_app node --experimental-strip-types ./src/db/seed.ts
else
  echo "Database already has $USER_COUNT users; skipping full seed."
fi

echo "Ensuring demo admin/operator links..."
run_as_app node --experimental-strip-types ./scripts/ensure-demo-ops.ts

echo "Starting TiangPass..."
exec runuser -u nextjs -- node server.js

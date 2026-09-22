/**
 * Idempotent repair for demo ops accounts on existing DBs.
 * Seed only runs when users=0, so production often has HANDLER users
 * without handlers rows (and stale admin passwords) after partial upgrades.
 *
 * Usage: node --experimental-strip-types ./scripts/ensure-demo-ops.ts
 */
import bcrypt from "bcryptjs";
import postgres from "postgres";

const DEMO_PASSWORD = "password123";

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  try {
    // Ensure admin exists with working password + ADMIN role
    const admins = await sql`
      select id, role, password_hash
      from users
      where lower(email) = 'admin@tiangpass.local'
      limit 1
    `;
    if (admins.length === 0) {
      const id = newId("usr");
      await sql`
        insert into users (id, name, email, password_hash, role, phone, citizenship, account_status)
        values (
          ${id},
          'Amina Admin',
          'admin@tiangpass.local',
          ${passwordHash},
          'ADMIN',
          '+601100000001',
          'MY',
          'ACTIVE'
        )
      `;
      console.log("Created demo admin user");
    } else {
      await sql`
        update users
        set
          password_hash = ${passwordHash},
          role = 'ADMIN',
          account_status = 'ACTIVE'
        where id = ${admins[0].id}
      `;
      console.log("Reset demo admin password + role");
    }

    const jetties = await sql`
      select id, name from jetties where active = true order by sort_order asc, name asc
    `;
    if (jetties.length === 0) {
      console.warn("No active jetties — cannot link operators");
      return;
    }

    const handlerUsers = await sql`
      select id, name, email
      from users
      where role = 'HANDLER'
      order by email asc
    `;

    let linked = 0;
    for (let i = 0; i < handlerUsers.length; i++) {
      const u = handlerUsers[i]!;
      const existing = await sql`
        select id from handlers where user_id = ${u.id} limit 1
      `;
      if (existing.length > 0) continue;

      const jetty = jetties[i % jetties.length]!;
      const handlerId = newId("hdl");
      const displayName =
        typeof u.name === "string" && u.name.trim()
          ? u.name.trim()
          : String(u.email);
      await sql`
        insert into handlers (id, user_id, jetty_id, display_name, license_no, mock_earnings_cents)
        values (
          ${handlerId},
          ${u.id},
          ${jetty.id},
          ${displayName},
          ${`PNG-H-AUTO-${String(i + 1).padStart(3, "0")}`},
          0
        )
      `;
      linked += 1;
      console.log(`Linked operator ${u.email} → jetty ${jetty.name}`);
    }

    // Reset known demo handler passwords too
    await sql`
      update users
      set password_hash = ${passwordHash}, account_status = 'ACTIVE'
      where lower(email) in (
        'handler@tiangpass.local',
        'handler2@tiangpass.local',
        'handler3@tiangpass.local',
        'fisher@tiangpass.local'
      )
    `;

    console.log(
      `ensure-demo-ops done · handlers linked: ${linked} · handler users: ${handlerUsers.length}`,
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((err) => {
  console.error("ensure-demo-ops failed", err);
  process.exit(1);
});

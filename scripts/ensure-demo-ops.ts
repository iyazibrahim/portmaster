/**
 * Idempotent repair for demo ops accounts on existing DBs.
 * Seed only runs when users=0, so production often has HANDLER users
 * without handlers rows (and stale/broken admin rows) after partial upgrades.
 *
 * Usage: node --experimental-strip-types ./scripts/ensure-demo-ops.ts
 */
import bcrypt from "bcryptjs";
import postgres from "postgres";

const DEMO_PASSWORD = "password123";
const ADMIN_EMAIL = "admin@tiangpass.local";
const ADMIN_ID = "usr_demo_admin";

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
    const sessionCols = await sql`
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name = 'sessions'
      order by ordinal_position
    `;
    console.log(
      "sessions columns:",
      sessionCols
        .map(
          (c) =>
            `${c.column_name}:${c.data_type}:null=${c.is_nullable}:default=${c.column_default ?? "-"}`,
        )
        .join(" | "),
    );

    // Wipe prior demo admin sessions, then upsert a stable admin id.
    await sql`
      delete from sessions
      where user_id in (
        select id from users where lower(email) = ${ADMIN_EMAIL}
      )
    `;

    const existingAdmins = await sql`
      select id from users where lower(email) = ${ADMIN_EMAIL}
    `;

    if (existingAdmins.length === 0) {
      await sql`
        insert into users (
          id, name, email, password_hash, role, phone, citizenship, account_status
        ) values (
          ${ADMIN_ID},
          'Amina Admin',
          ${ADMIN_EMAIL},
          ${passwordHash},
          'ADMIN',
          '+601100000001',
          'MY',
          'ACTIVE'
        )
      `;
      console.log("Created demo admin", ADMIN_ID);
    } else {
      await sql`
        update users
        set
          email = ${ADMIN_EMAIL},
          password_hash = ${passwordHash},
          role = 'ADMIN',
          account_status = 'ACTIVE',
          name = coalesce(nullif(name, ''), 'Amina Admin')
        where lower(email) = ${ADMIN_EMAIL}
      `;
      console.log("Reset demo admin password + role for", existingAdmins[0]!.id);
    }

    const admin = (
      await sql<{ id: string }[]>`
        select id from users where lower(email) = ${ADMIN_EMAIL} limit 1
      `
    )[0];
    if (!admin?.id) {
      throw new Error("Admin row missing after upsert");
    }

    // Prove sessions insert works for this admin (root cause of live login failure).
    const probeToken = `probe_${crypto.randomUUID().replace(/-/g, "")}`;
    try {
      await sql`
        insert into sessions (session_token, user_id, expires)
        values (${probeToken}, ${admin.id}, ${new Date(Date.now() + 60_000)})
      `;
      await sql`delete from sessions where session_token = ${probeToken}`;
      console.log("Admin session insert probe OK for", admin.id);
    } catch (probeErr) {
      console.error("Admin session insert probe FAILED", probeErr);
      throw probeErr;
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
      `ensure-demo-ops done · admin=${admin.id} · handlers linked: ${linked} · handler users: ${handlerUsers.length}`,
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((err) => {
  console.error("ensure-demo-ops failed", err);
  process.exit(1);
});

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
    // ICU/glibc image swaps leave a recorded collation version with no actual
    // version (postinit.c CheckMyDatabase WARNING on every connection).
    try {
      const dbName = (await sql`select current_database() as name`)[0]?.name;
      if (dbName) {
        await sql.unsafe(
          `ALTER DATABASE "${String(dbName).replace(/"/g, '""')}" REFRESH COLLATION VERSION`,
        );
        console.log("Refreshed collation version for", dbName);
      }
    } catch (collationErr) {
      console.warn(
        "Collation refresh skipped:",
        collationErr instanceof Error ? collationErr.message : collationErr,
      );
    }
    try {
      await sql.unsafe(`
        UPDATE pg_database
        SET datcollversion = NULL
        WHERE datname = current_database()
          AND datcollversion IS NOT NULL
          AND pg_database_collation_actual_version(oid) IS NULL
      `);
      console.log("Cleared recorded collation version with no actual version");
    } catch (collationClearErr) {
      console.warn(
        "Collation version clear skipped:",
        collationClearErr instanceof Error
          ? collationClearErr.message
          : collationClearErr,
      );
    }

    // Ensure search_path cannot shadow public.users (would explain SELECT-ok + FK-fail).
    await sql`select set_config('search_path', 'public', false)`;

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

    const userRel = await sql`
      select c.relkind, n.nspname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where c.relname = 'users'
      order by n.nspname
    `;
    console.log(
      "relations named users:",
      userRel.map((r) => `${r.nspname}.${r.relkind}`).join(", ") || "(none)",
    );

    // Drop orphan sessions first, then rebuild FK against public.users.
    await sql`
      delete from public.sessions s
      where not exists (
        select 1 from public.users u where u.id = s.user_id
      )
    `;
    await sql.unsafe(`
      alter table public.sessions
        drop constraint if exists sessions_user_id_users_id_fk
    `);
    await sql.unsafe(`
      alter table public.sessions
        add constraint sessions_user_id_users_id_fk
        foreign key (user_id) references public.users(id)
        on delete cascade
    `);
    console.log("Recreated sessions_user_id_users_id_fk → public.users(id)");

    // Nuclear demo-admin rebuild so login never references a ghost id.
    const oldAdminIds = await sql<{ id: string }[]>`
      select id from public.users where lower(email) = ${ADMIN_EMAIL}
    `;
    for (const row of oldAdminIds) {
      await sql`delete from public.sessions where user_id = ${row.id}`;
    }

    // Clear optional FKs that may block user delete (best-effort).
    for (const row of oldAdminIds) {
      try {
        await sql`update public.audit_logs set actor_id = null where actor_id = ${row.id}`;
      } catch {
        /* column may not exist on older DBs */
      }
      try {
        await sql`update public.account_blocks set created_by = null where created_by = ${row.id}`;
      } catch {
        /* ignore */
      }
    }

    try {
      await sql`delete from public.users where lower(email) = ${ADMIN_EMAIL}`;
      await sql`delete from public.sessions where user_id = ${ADMIN_ID}`;
      await sql`delete from public.users where id = ${ADMIN_ID}`;
    } catch (delErr) {
      console.warn(
        "Could not fully delete old admin (FK in use); will upsert instead:",
        delErr instanceof Error ? delErr.message : delErr,
      );
    }

    const stillThere = await sql`
      select id from public.users where id = ${ADMIN_ID} or lower(email) = ${ADMIN_EMAIL}
    `;
    if (stillThere.length === 0) {
      await sql`
        insert into public.users (
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
      console.log("Recreated demo admin", ADMIN_ID);
    } else {
      await sql`
        update public.users
        set
          email = ${ADMIN_EMAIL},
          password_hash = ${passwordHash},
          role = 'ADMIN',
          account_status = 'ACTIVE',
          name = coalesce(nullif(name, ''), 'Amina Admin')
        where id = ${stillThere[0]!.id}
      `;
      console.log("Upserted demo admin in place", stillThere[0]!.id);
    }

    const adminRow = (
      await sql<{ id: string }[]>`
        select id from public.users where lower(email) = ${ADMIN_EMAIL} limit 1
      `
    )[0];
    if (!adminRow?.id) {
      throw new Error("Admin row missing after upsert");
    }

    const verify = await sql`
      select id from public.users where id = ${adminRow.id} limit 1
    `;
    if (verify.length === 0) {
      throw new Error(
        `Admin id ${adminRow.id} selected by email but missing by primary key`,
      );
    }

    const probeToken = `probe_${crypto.randomUUID().replace(/-/g, "")}`;
    const probeExpires = new Date(Date.now() + 60_000).toISOString();
    await sql`
      insert into public.sessions (session_token, user_id, expires)
      values (${probeToken}, ${adminRow.id}, ${probeExpires}::timestamptz)
    `;
    await sql`delete from public.sessions where session_token = ${probeToken}`;
    console.log("Admin session insert probe OK for", adminRow.id);

    const jetties = await sql`
      select id, name
      from public.jetties
      where active = true
      order by sort_order asc, name asc
    `;
    if (jetties.length === 0) {
      console.warn("No active jetties — cannot link operators");
      return;
    }

    const handlerUsers = await sql`
      select id, name, email
      from public.users
      where role = 'HANDLER'
      order by email asc
    `;

    let linked = 0;
    for (let i = 0; i < handlerUsers.length; i++) {
      const u = handlerUsers[i]!;
      const existing = await sql`
        select id from public.handlers where user_id = ${u.id} limit 1
      `;
      if (existing.length > 0) continue;

      const jetty = jetties[i % jetties.length]!;
      const handlerId = newId("hdl");
      const displayName =
        typeof u.name === "string" && u.name.trim()
          ? u.name.trim()
          : String(u.email);
      await sql`
        insert into public.handlers (
          id, user_id, jetty_id, display_name, license_no, mock_earnings_cents
        ) values (
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
      update public.users
      set password_hash = ${passwordHash}, account_status = 'ACTIVE'
      where lower(email) in (
        'handler@tiangpass.local',
        'handler2@tiangpass.local',
        'handler3@tiangpass.local',
        'fisher@tiangpass.local'
      )
    `;

    console.log(
      `ensure-demo-ops done · admin=${adminRow.id} · handlers linked: ${linked} · handler users: ${handlerUsers.length}`,
    );
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((err) => {
  console.error("ensure-demo-ops failed", err);
  process.exit(1);
});

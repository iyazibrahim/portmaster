# PortMaster workflow

## Status

**App-wide UI polish shipped:** People CRUD (create/role/reset password + HANDLER jetty), SearchableSelect jetty labels (no raw IDs), Card forms + Table search + 10/page across Admin, Fisher, and Boatmen.

**Desktop UX polish shipped:** searchable jetty pickers, location table search + 10/page pagination, ops jetty filter as searchable select (no chip wall), wider profile/trips layouts, fishing-aligned landing + auth (kept soft-blue + plus-grid background).

**Meeting gap items:** max 4 pax per tiang, multi-tiang boat splits (`trip_group_id`), Admin OPEN/CLOSED. Tiang QR / wrong-location alerts still deferred.

Multi-jetty: ~33 Penang fishing jetties. Docker Compose optional at http://127.0.0.1:43127.

## Decisions

- Auth: custom credentials login creates Auth.js **database sessions** (HTTP-only `authjs.session-token`).
- Boarding QR: opaque `nanoid` tokens in `booking_access_tokens` (not JWT).
- ORM: Drizzle + PostgreSQL 16 only (no Prisma/SQLite).
- UI: shadcn/ui; **harbor-blue CSS tokens**. Geist body + Newsreader on landing brand only.
- **UI layout:** desktop-first, mobile-ready — not a phone UI stretched to desktop.
- Product language: **Location** (DB table `locations`). Meeting term **tiang** = location.
- **LLM** = Lembaga Lebuh Raya Malaysia (external). No LLM app role — **Admin** opens/closes locations from their list; Admin can create another Admin on `/admin/users`.
- **Max 4 pax per location per trip date** (holds: PENDING_PAYMENT + CONFIRMED + CHECKED_IN). Boat capacity is separate.
- **Multi-tiang split:** one boat trip → linked bookings via `trip_group_id`; primary leg holds seats + payment + one boarding QR; check-in/out updates the whole group.
- Multi-jetty: locations/handlers/bookings scoped with `jetty_id`.
- Penang Bridge Fishing keeps rich 85/side locations; other jetties get Main landing + Berth 1–N.
- Admin IT settings: separate password + `it_settings_ok` cookie (~20 min).
- Local Postgres: Neon / local install, **or** Compose `postgres:16`.
- Docker entrypoint: `drizzle-kit push --force`, seed only if `users` is empty, then `next start`.
- Docker login: session cookies follow `APP_URL` (HTTP vs HTTPS), not `NODE_ENV`.

## Local-without-Docker

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev            # http://127.0.0.1:43127
```

### Trip-group migrate (existing DBs)

```bash
psql "$DATABASE_URL" -f drizzle/0003_trip_groups.sql
npm run db:push
npm run db:seed
```

### Multi-jetty migrate (existing DBs)

```bash
psql "$DATABASE_URL" -f drizzle/0002_multi_jetty.sql
npm run db:push
npm run db:seed
```

### Location rename migrate (older DBs with tiangs)

```bash
psql "$DATABASE_URL" -f drizzle/0001_rename_tiang_to_location.sql
psql "$DATABASE_URL" -f drizzle/0002_multi_jetty.sql
npm run db:push
npm run db:seed
```

## Docker (2026-09-18)

```bash
docker compose up --build -d
# http://127.0.0.1:43127
# GET /api/health → {"status":"ok"}
```

- Containers: `portmaster-app-1` (healthy), `portmaster-postgres-1` (healthy)
- Entrypoint applies current schema (`drizzle-kit push --force`), seeds once if `users` is empty, then `next start`
- Seeded: 33 jetties, 294 locations, 4 boats, demo logins
- Stop: `docker compose down` (volume `portmaster_pg` keeps data)

### Login refresh loop (2026-09-18)

Signing in on Docker bounced back to `/login`. Cause: `NODE_ENV=production` set `__Secure-authjs.session-token` with `Secure`, which browsers drop on `http://127.0.0.1`. Fix: cookie name/`Secure` follow `APP_URL`/`AUTH_URL` protocol; login redirects server-side after setting the cookie. Rebuild: `docker compose up --build -d`.

## Multi-tiang + max-4 (2026-09-18)

- Schema: `bookings.trip_group_id`, `bookings.is_primary`
- Book wizard: Jetty → When → Party → Boat → Seats → **Locations allocate** → Pay
- Occupancy shown as free slots per tiang; enforce max 4 server-side
- Smoke: two-jetty flow + 10-pax split (4+4+2) + overfill blocked
- Deferred: tiang QR, GPS, wrong-location alerts

## Desktop UX + fishing landing (2026-09-18)

- `SearchableSelect` for jetty booking + admin jetty filter (names, not ids; search)
- Locations allocate: search + **10 per page** pagination
- Removed redundant book copy (flow subtitle, LLM aside)
- Profile + trips: full-width desktop layouts; trips table on `md+`
- Landing/auth: fishing SVG scene; **kept** soft-blue radial + plus-grid background
- Shared `MarketingBackground` + `FishingScene`

## App-wide UI polish + People management (2026-09-18)

- Shared `useClientPagination` + `PaginationBar` (10/page) for admin/fisher/handler lists
- Admin Locations/Jetties/Reports/People: Card forms, SearchableSelect jetty labels, compact CTAs
- People CRUD: create user (USER/HANDLER/ADMIN), role edit, HANDLER jetty upsert, password reset
- Admin Payments/Ops/Settings: searchable tables, Card settings, constrained filters
- Fisher: trips search+pagination, Card receipt/profile, compact booking footer buttons
- Boatmen: schedule Tables + search, Card scanner/earnings, fleet Table + Card form
- **Create flows in Dialogs** (People / Locations / Jetties / Fleet) so lists stay primary
- SearchableSelect portals + viewport-aware max-height so role/jetty menus scroll
- Deferred still: tiang QR, GPS, wrong-location alerts

## Multi-jetty (2026-09-18)

- Commit: `eda739c` on `main` (via `cursor/multi-jetty-334a`)
- Seed: 33 Penang fishing/nelayan jetties
- Book: Jetty picker first in wizard
- Admin: `/admin/jetties` CRUD; Locations/Ops/Payments/Reports filter by jetty
- Handlers: `handler@` → Penang Bridge Fishing; `handler2@` → Jeti Batu Uban
- Dev: http://127.0.0.1:43127

## Demo logins

- fisher@portmaster.local / password123
- handler@portmaster.local / password123 (Penang Bridge Fishing)
- handler2@portmaster.local / password123 (Jeti Batu Uban)
- admin@portmaster.local / password123
- IT settings: it-settings-demo

## Out of scope

Real FPX, WhatsApp, offline QR sync, i18n, weather, catch logging, live GPS, tiang-mounted QR / wrong-tiang alerts, PDF reports, commercial cargo terminals.

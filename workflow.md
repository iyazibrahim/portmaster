# PortMaster workflow

## Status

**Multi-jetty support** shipped: `jetties` table, ~33 Penang fishing jetties seeded, book flow Jetty → Location → boat/seats → pay, admin Jetty CRUD, ops/payments/reports jetty filters, boatmen scoped to their jetty.

Local path remains **Node + DATABASE_URL only**. Docker/compose optional for deploy.

## Decisions

- Auth: custom credentials login creates Auth.js **database sessions** (HTTP-only `authjs.session-token`).
- Boarding QR: opaque `nanoid` tokens in `booking_access_tokens` (not JWT).
- ORM: Drizzle + PostgreSQL 16 only (no Prisma/SQLite).
- UI: shadcn/ui components as-is; **harbor-blue CSS tokens** (navy sidebar, mid-blue primary, soft workspace). Geist body + Newsreader on landing brand only.
- Product language: **Location** (DB table `locations`, `location_id` FKs).
- Multi-jetty: `jetties` table; locations/handlers/bookings scoped with denormalized `bookings.jetty_id`.
- Penang Bridge Fishing keeps rich 85/side locations; other jetties get Main landing + Berth 1–N.
- Admin IT settings: separate password + `it_settings_ok` cookie (~20 min).
- Local Postgres: Neon / local install — **not Docker** for day-to-day.

## Local-without-Docker

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev            # http://127.0.0.1:43127
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

## Multi-jetty (2026-09-18)

- Commit: `eda739c` on `main` (via `cursor/multi-jetty-334a`)
- Seed: 33 Penang fishing/nelayan jetties
- Book: Jetty picker first in wizard
- Admin: `/admin/jetties` CRUD; Locations/Ops/Payments/Reports filter by jetty
- Handlers: `handler@` → Penang Bridge Fishing; `handler2@` → Jeti Batu Uban
- Build/lint: pass · smoke: SMOKE_OK (two jetties)
- Dev: http://127.0.0.1:43127
- Screenshots: project `media/multi-jetty-*.png`

## Demo logins

- fisher@portmaster.local / password123
- handler@portmaster.local / password123 (Penang Bridge Fishing)
- handler2@portmaster.local / password123 (Jeti Batu Uban)
- admin@portmaster.local / password123
- IT settings: it-settings-demo

## Out of scope

Real FPX, WhatsApp, offline QR sync, i18n, weather, catch logging, live GPS, PDF reports, commercial cargo terminals.

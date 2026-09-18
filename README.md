# PortMaster

Digital ops platform for **Penang fishing jetties** — book a trip, pick seats on a boat, pay (mock), and board with a time-limited QR pass. Built for anglers, boatmen, and port admins.

**Who it’s for**

| Role | What they do |
|------|----------------|
| **Angler** | Sign up, choose jetty → location → boat seats, pay, show QR |
| **Boatmen** | Jetty-scoped schedule, QR check-in/out, fleet & earnings |
| **Admin** | Jetties, locations, live ops, payments, reports, settings |

---

## Features

- **~33 Penang fishing jetties** seeded (admin can add more)
- **Locations** under each jetty (Penang Bridge Fishing keeps the full numbered pillar map)
- Interactive **boat seat map** during booking
- **Mock payment** → opaque, single-use **QR boarding token** (not JWT)
- Angler **PWA** (installable; shell cache + offline page)
- Admin **ops / payments / weekly–monthly CSV reports**
- **Tiered settings** — ops editable by admin; IT settings (API, TTL, SMTP, etc.) password-gated
- Harbor-blue **shadcn/ui** theme, responsive desktop + mobile

---

## Stack

- **Next.js** (App Router) · TypeScript · Tailwind CSS · **shadcn/ui**
- **PostgreSQL 16** · **Drizzle ORM**
- **Auth.js** credentials + database sessions (HTTP-only cookies)

---

## Quick start (local — no Docker)

You need **Node.js 22+** and a **Postgres 16+** URL (Neon, Supabase, local install, etc.).

```bash
git clone https://github.com/iyazibrahim/portmaster.git
cd portmaster
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://...
#   AUTH_SECRET=$(openssl rand -base64 32)

npm install
npm run db:setup    # push schema + seed demo data
npm run dev         # http://127.0.0.1:43127
```

### Environment

See [`.env.example`](.env.example):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js secret |
| `APP_URL` | Public base URL (no trailing slash) |
| `PORT` | Listen port (default `43127`) |
| `AUTH_TRUST_HOST` | Set `true` behind proxies |

### Demo accounts

Password for all: **`password123`**

| Role | Email |
|------|--------|
| Angler | `fisher@portmaster.local` |
| Boatmen (Penang Bridge) | `handler@portmaster.local` |
| Boatmen (Batu Uban) | `handler2@portmaster.local` |
| Admin | `admin@portmaster.local` |

**IT settings unlock** (Admin → Settings → IT): `it-settings-demo`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `43127` |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:setup` | `drizzle-kit push` + seed |
| `npm run db:push` | Push schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Re-seed (**clears** demo tables) |

---

## Migrations (existing databases)

If you already ran an older PortMaster schema:

```bash
# If you still have the old `tiangs` table name:
psql "$DATABASE_URL" -f drizzle/0001_rename_tiang_to_location.sql

# Multi-jetty:
psql "$DATABASE_URL" -f drizzle/0002_multi_jetty.sql
npm run db:push
npm run db:seed
```

Fresh installs: `npm run db:setup` is enough.

---

## Optional: Docker / Dokploy

Not required on your laptop. For a VPS or Dokploy:

```bash
docker compose up --build
```

- App health: `GET /api/health`
- Compose provides `app` + `postgres:16`
- Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `PORT` in the host/Dokploy env

---

## Project layout

```
src/app/           # Routes (angler, boatmen, admin, auth, policy)
src/components/    # UI + booking seat map, admin panels
src/db/            # Drizzle schema + seed
src/lib/           # Auth, booking, actions
drizzle/           # SQL migrations
public/            # PWA manifest, icons, service worker
```

---

## Security notes

- Boarding QR codes are **opaque server-side tokens** (TTL, single-use, revocable)
- Minimize personal data; design is PDPA-minded (demo data only in seed)
- Do not commit real `.env` secrets

---

## Roadmap / out of scope (for now)

Real FPX / e-wallets, WhatsApp/SMS, live GPS, offline booking write-sync, PDF reports, full i18n, commercial Port of Penang cargo terminals.

---

## License

Private project — all rights reserved unless otherwise stated by the owner.

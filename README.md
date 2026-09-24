# TiangPass

Association operations platform for **same-day recreational fishing** under authorised bridge pillars.

Anglers buy an **RM5 Association fee** pass (mock payment in MVP1), optionally request a **boat owner** at a boarding jetty, pick one pillar (max 4 anglers), and show a QR for operator check-in. Boat fare is negotiated outside the app. Association Admin runs ops; **LLM Viewer** is view-only monitoring.

**Actors**

| Role | What they do |
|------|----------------|
| **Angler** | Register, buy same-day pass, view QR/receipt |
| **Boat Operator** | Jetty-scoped scan / check-in-out (MVP2 geofence) |
| **Association Admin** | Pillars, jetties, boats/owners, passes, payments, alerts, reports, settings, audit |
| **LLM Viewer** | View-only ops dashboard (no master-data edits) |

---

## MVP1 features

- Same-day pass: jetty → already-have-boat **or** pick boat owner → one pillar → mock RM5 → QR
- Max **4** per pillar; **10-minute** slot reservation during payment
- Identity: MyKad (unique), age ≥ 14, Malaysian, PDPA/location consents (no MyDigitalID yet)
- Association dashboard + LLM view-only dashboard (wireframe IA)
- Mock payment only — real gateway deferred (see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md))

---

## Stack

- **Next.js** (App Router) · TypeScript · Tailwind CSS · **shadcn/ui**
- **PostgreSQL 16** · **Drizzle ORM**
- **Auth.js** credentials + database sessions (HTTP-only cookies)

---

## Quick start

```bash
cp .env.example .env
# DATABASE_URL=postgresql://...
# AUTH_SECRET=$(openssl rand -base64 32)

npm install
npm run db:setup
npm run dev            # http://127.0.0.1:43127
```

### Demo accounts

Password for all: **`password123`**

| Role | Email |
|------|--------|
| Angler | `fisher@tiangpass.local` |
| Operator | `handler@tiangpass.local` |
| Operator (2nd jetty) | `handler2@tiangpass.local` |
| Association Admin | `admin@tiangpass.local` |
| LLM Viewer | `llm@tiangpass.local` |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `43127` |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (domain / AC unit tests) |
| `npm run db:setup` | `drizzle-kit push` + seed |
| `npm run db:seed` | Re-seed (**clears** demo tables) |
| `npm run db:cleanup` | Purge expired sessions/tokens + audit older than 1 year |
| GitHub Actions `Docker build & push` | Build image on CI → GHCR (VPS only pulls) |

### Deploy without OOM (recommended)

Build happens on GitHub, not on the VPS:

1. Push to `main` (or run **Actions → Docker build & push → Run workflow**).
2. On the VPS:

```bash
# once (if the GHCR package is private): create a PAT with read:packages
echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin

export APP_IMAGE=ghcr.io/iyazibrahim/portmaster:latest
./scripts/vps-pull-deploy.sh
# or: docker compose pull app && docker compose up -d app
```

Do **not** run `docker compose build` on a 4GB VPS if you can avoid it.

---

## Project layout

```
src/app/           # Routes (angler pass, operator, admin, llm, auth)
src/components/    # UI + pass wizard, dashboards
src/db/            # Drizzle schema + seed
src/domain/        # Pass occupancy & status invariants
src/lib/           # Auth, payments mock, actions
drizzle/           # SQL migrations
```

Legacy seat-map booking (`/book`, `bookings`) remains in the codebase but is **not** the primary angler path.

---

## Security / PDPA

- Opaque QR tokens (TTL, single-use patterns)
- MyKad stored hashed + last-4 display
- Minimize personal data; see OPEN_QUESTIONS for retention hooks
- Do not commit real `.env` secrets

---

## License

Private project — all rights reserved unless otherwise stated by the owner.

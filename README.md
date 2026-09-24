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
| GitHub Actions | Build image → GHCR → trigger **Dokploy** deploy |

### Dokploy deploy (no VPS build / no manual script)

**Goal:** `next build` runs on GitHub. Dokploy only **pulls** the image and restarts containers.

#### One-time Dokploy UI

1. **Registry** → add `ghcr.io` (GitHub username + PAT with `read:packages`).
2. Your **Compose** service uses this repo’s `docker-compose.yml` (app image = `ghcr.io/iyazibrahim/portmaster:latest`).
3. **Critical:** Compose → custom **Command** must **not** include `--build`.  
   Prefer pull then up (copy Dokploy’s default command from the UI, remove `--build`, ensure `pull` runs).  
   If Dokploy keeps `--build`, the VPS will OOM again.
4. Generate an API key: Dokploy profile → **API/CLI**.

#### GitHub Actions secrets

| Secret | Value |
|--------|--------|
| `DOKPLOY_URL` | `https://your-dokploy-host` (no trailing slash needed) |
| `DOKPLOY_API_KEY` | API token from Dokploy |
| `DOKPLOY_COMPOSE_ID` | Compose stack id (this project) |
| *or* `DOKPLOY_APPLICATION_ID` | Only if you use a single Docker Application instead |

#### Day-to-day

Push to `main` (or **Actions → Docker build & Dokploy deploy → Run workflow**).  
CI builds → pushes GHCR → calls Dokploy `compose.deploy` / `application.deploy`. Done.

**App env (Dokploy compose environment, not GitHub Actions):** set at least `AUTH_SECRET`, `APP_URL` (public HTTPS URL). For HitPay: `HITPAY_API_KEY`, `HITPAY_WEBHOOK_SALT`, optional `HITPAY_API_URL` / `HITPAY_CURRENCY` / `HITPAY_PAYMENT_METHODS`. These are wired in `docker-compose.yml` `app.environment` — vars only in the Dokploy UI that are **not** listed there never reach the container. Redeploy after changing env.

Local laptop build (optional):  
`docker compose -f docker-compose.yml -f docker-compose.build.yml build`

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

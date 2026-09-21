# TiangPass workflow

**Official logo (2026-09-21):** `TiangPass Logo.jpg` white backdrop removed (flood-fill) → transparent `public/brand/tiangpass-logo.png`; favicon / PWA icons / `BrandLogo` on landing, auth, nav, install banner. New fishing illustration is cache-busted **brush-edge** `tiangpass-scene-brush.png` (no metallic badge) on marketing + login/signup.

**iOS Chrome scan + bottom nav (2026-09-21):** Scanner falls back to `jsQR` when `BarcodeDetector` is missing (iPhone Chrome/Safari). App shell uses `h-dvh overflow-hidden` with in-flow `MobileBottomNav` so the tab bar no longer floats after the Chrome URL bar hides.

**Admin UX scale (2026-09-21):** Shared `AdminDataTable` (search, `min-h-11`, 15/page) + `StatusBadge` traffic lights (no underscore labels). Passes / Boats / Operators / Pillars / Jetties / Payments / Audit use the shell. Payments KPI widgets (today MYT). Alerts auto-refresh (overdue CI, boat permit ≤30d, failed pay) + resolve; incidents create + status flow. Reports live KPIs + equal-height controls. Settings bento for pass ops; IT unlock retained.

## Status

**Account / GPS / PWA / compliance (2026-09-21):**
- Mobile EN/BM on top bar + admin sheet + Profile
- Camera-only e-KYC photo (signup + Profile retake); no file upload
- Admin jetty create/edit with lat/lng + radius (default **100 m**); geofence uses per-jetty radius
- Soft PWA install banner on mobile; hard GPS gate to buy pass (seed demo bypass retained)
- PDPA Privacy, Consent, Cookies pages + first-visit cookie banner
- Status labels humanized (e.g. In Progress); Audit Trail shows When / Who / Action / Entity / Reference
- Profile redesign: change-password modal, edit details, PDPA delete/anonymise; angler shows FR-REG-002 fields (MyKad last4, DOB/age, citizenship, address, emergency name+number, consents)

**Rebrand (2026-09-21):** Product renamed from PortMaster → **TiangPass** (UI, package `tiangpass`, demo emails `@tiangpass.local`, locale cookie `tiangpass_locale`, Docker DB user/db `tiangpass`).

**PRD alignment (2026-09-21):** Implemented decided scope:
- Pass-only purchase (no boat booking step); boat hire outside app
- Geofence on purchase + operator CI/CO (Admin bypass)
- Camera + paste scanner with photo preview
- Per-pillar MAX + PRD pillar statuses; PRD boat statuses
- Boat owners with login; handlers staff under owners; Admin fleet CRUD
- Blacklist/suspend UI; pass-based payments & reports (CSV); audit writes
- LLM sub-pages filled; BM/EN locale switch; overdue list only
- Mock `PaymentProvider` retained; `prd/` gitignored; photos in `data/photos/`

**Pass QR scan + responsive chrome (2026-09-18):** Operator scanner resolves `pass_qr_tokens` (check-in then check-out; same QR). Shell sidebar/bottom-nav switches at `lg` (1024px).

**Penang Bridge corridor (2026-09-18):** MVP1 boarding is four jetties around Jambatan Pulau Pinang (Batu Uban, Jelutong, Bagan Dalam/Perai, Kuala Juru). Other Penang landings stay in the catalog as inactive.

Legacy seat-map booking UI is hidden; DB tables retained. `/book` redirects to `/pass`. Overnight: unused Active → Expired; Checked-In stays until checkout.

## Product decisions (2026-09-21 PRD sync)

See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) for the full locked table.

## Stack decisions

- Auth: custom credentials → Auth.js **database sessions**.
- Pass QR: opaque `nanoid` in `pass_qr_tokens`.
- ORM: Drizzle + PostgreSQL 16.
- UI: shadcn/ui; harbor-blue tokens; BM/EN via `tiangpass_locale` cookie.
- Payment: `PaymentProvider` interface + mock only.
- Photos: `data/photos/` via authenticated `/api/photos/[key]` (camera capture only for anglers).
- Migrations: Docker/Dokploy boot applies `0000` + `0002` then `0004`–`0007` via `scripts/apply-srs-mvp1.ts`.

## Local

```bash
cp .env.example .env
npm install
# Ensure Postgres is up (e.g. docker compose up -d postgres)
# Fresh volume after DB rename: docker compose down -v && docker compose up -d postgres
npm run db:push
npx tsx --env-file=.env scripts/apply-srs-mvp1.ts
npm run db:seed
npm run dev            # http://127.0.0.1:43127
npm run test
# Optional PRD pass CI/CO smoke:
npx tsx --env-file=.env scripts/smoke-prd-pass.ts
```

## Demo logins

Password: `password123`

- fisher@tiangpass.local (Angler)
- handler@tiangpass.local / handler2@tiangpass.local (Operators)
- admin@tiangpass.local (Association Admin)
- llm@tiangpass.local (LLM Viewer)
- owner1@tiangpass.local … owner4 (boat owner logins)

## Validation (2026-09-21)

- Account/UX compliance batch: `npm run lint` clean · `npm test` 23 passed · `npm run build` passed · migration `0006_jetty_radius_100` applied
- Prior: smoke-prd-pass OK; browser E2E for pass wizard / scan / admin / LLM

## Docker tips

- Prefer local `npm run dev` for day-to-day work.
- Mount or create `data/photos` so profile photo uploads work in containers.

## Docker / Dokploy (2026-09-21)

Fresh Postgres used to crash on boot (`type "user_role" does not exist`) because only additive `0004`–`0007` ran. Boot now applies baseline `0000` + jetties `0002` first. Redeploy the new image; restarting the old one will keep failing.

**4GB VPS OOM harden (2026-09-21):** Build heap capped at 1.5GB (was 3GB), single `npm ci` then prune (no parallel installs), Next `cpus: 1` + webpack memory opts, Compose `mem_limit` on app (768MB) + Postgres (512MB, tuned `shared_buffers`). Strongly add **2GB swap** on the host before rebuild:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

If build still OOMs, build the image elsewhere and push to a registry, or temporarily stop other containers during deploy.

Validated: empty Postgres 16 → apply (users/jetties/passes) → apply again (idempotent) → seed.

Seed on Docker uses `node --experimental-strip-types` (no tsx). Relative imports in `src/db/seed.ts` must include `.ts` extensions (`./schema.ts`, `../lib/utils-app.ts`) and not import `./index` (Node ESM cannot resolve extensionless paths).

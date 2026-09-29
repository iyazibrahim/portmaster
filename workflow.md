# TiangPass workflow

**Launch readiness (2026-09-29):** Privacy, consent, and cookies rewritten for live PDPA language (EN/BM); contact from Admin settings; no analytics cookies. Compose/README note that named volumes survive rebuilds (R2 backs Postgres). Rate-limit map prunes and caps keys. Payment fulfillment failures create one PAYMENT_FAILED alert and email `receipt_email` once when SMTP is set.

**PWA install guide (2026-09-29):** The phone install banner opens a step list. iPhone Safari uses Share → Add to Home Screen. Android Chrome uses the three-dot menu → Install app. In-app browsers are told to open Safari or Chrome first. English and Bahasa Melayu.

**API security pass (2026-09-29):** Sessions, roles, webhook signatures, and existing rate limits stay. Added HTTPS redirect only when `APP_URL`/`AUTH_URL` is https (local HTTP unchanged), security headers, timing-safe cron secret compare, Stripe/HitPay checkout idempotency keys, a single-winner payment activation, generic public errors, login and password-reset audit rows, and `npm run audit:deps`. Nodemailer high advisories have no fix yet; the mailer disables file and URL access. Demo `password123` remains seed-only.

**Code cleanup (2026-09-29):** Removed unused table imports on the admin ops page. MyKad formatting and Malaysia calendar helpers now live in client-safe modules shared with signup. Forgot-password and reset-password share one auth card shell. Required asterisks share one mark component.

**Reset password card (2026-09-29):** The forgot-password card is vertically centered on a phone, in the space under the header.

**Signup password icon (2026-09-29):** On the phone password step, a key icon sits above the Password label so the empty area over the fields is not blank. Desktop sign up and reset password stay unchanged.

**Signup photo step (2026-09-29):** On a phone, the identity photo, Open camera button, and hint are centered in the photo card. Each consent line shows a red asterisk because the photo and all three consents are required before sign up.

**Signup password step (2026-09-29):** The password fields sit in the vertical middle of the phone card, with Back and Next still along the bottom, so the short step does not leave a large empty region under the inputs.

**Signup card size (2026-09-29):** On a phone, every signup step uses the same card height (fills the screen under the header). Back and Next stay at the bottom, including the shorter password step.

**Signup card spacing (2026-09-29):** Mobile signup card uses tighter title, field, and section spacing so the address step fits on a phone without scrolling. Desktop spacing stays looser.

**Signup email check (2026-09-29):** Email must include a real domain ending. `iyaz@gmail` shows “Enter a valid email address.” on the field; `iyaz@gmail.com` passes. The server uses the same check.

**Signup state selector (2026-09-29):** Address state uses the app dropdown (search + list) instead of the browser’s native menu.

**Signup step title (2026-09-29):** Mobile step 1 heading is “Tell us more about you” (BM: “Beritahu kami lebih lanjut tentang anda”).

**MyKad format (2026-09-29):** Signup MyKad types as `YYMMDD-PB-XXXX` (for example `900101-14-5678`). Date of birth fills from the first six digits and stays editable. The `YYMMDD######` placeholder is removed.

**Signup steps (2026-09-29):** Phone widths (`< lg`) split angler signup into About you, Address (house number, street, postcode, state, plus emergency contact), password, then photo and consents. Desktop stays one page with the same structured address. Postcode must be 5 digits and match the selected Malaysian state. Stored `users.address` remains one line.

**Pass wizard mobile lists (2026-09-29):** Jetty and pillar option lists no longer scroll inside the page on phone widths. The page is the only scroller, so a swipe on the list reaches Continue. Wide screens (`lg+`) keep the capped inner list.

**Signup form polish (2026-09-28):** Required fields show a red `*` (name, email, mobile, emergency contacts, MyKad, citizenship, password, confirm, address, identity photo). DOB is plain “Date of birth” (no MyKad-year hint). Photo label uses `*` instead of “(required)”. Mobile-only FishingScene removed; desktop left-column scene kept.

**Signup password UX (2026-09-28):** Password field has live strength bar, per-rule checklist (length/upper/lower/number/symbol), show/hide toggle, and confirm-password with mismatch error. Shared `PasswordWithStrengthFields` + client-safe `password-policy.ts`; also on reset-password. Client + server still enforce strong policy.

**Security hardening (2026-09-28):** In-memory rate limits (login 5/min, signup 3/min, forgot 3/min, boarding 30/min). bcrypt cost **12** via `hashPassword`. Signup/reset password policy: 8+ with upper, lower, number, symbol. Zod on login/reset/boarding. Generic login errors. HitPay requires webhook salt. `prefers-reduced-motion` + scan-flash on QR confirm.

**Admin force check-out (2026-09-28):** Ops “Still under bridge” table — Admin-only Check out with required reason, scan event + audit (`pass.admin_force_check_out`). No geofence.

**Password reset + SMTP (2026-09-28):** Forgot/reset via email. Branded HTML + plain-text template; link expires in **1 hour**, single-use, SHA-256 hashed token (`randomBytes` 32), token-only URL (no email in query), 60s resend cooldown, sessions revoked on reset, bcrypt cost 12. Admin IT: SMTP + Send test.

**Operator fleet detail modal (2026-09-28):** Fleet mobile rows (and desktop table) open a modal with registration, owner, jetty, capacity, permit expiry, licence, and price/person.

**Operator Pillars bento (2026-09-28):** Pillars tab is a 2/3-col bento grid; tap a tile to open a modal of checked-in anglers (name, ref, since). Occupied/full tiles tint sky/amber.

**Operator Pillars tab (2026-09-28):** Bottom nav left of Scan: Today + Pillars. `/handler/pillars` lists all jetty pillars with checked-in anglers (name, pass ref, since), capacity, SoftLiveRefresh 45s. Occupied pillars sort first. EN/MS: `nav.pillarsTab`, `handler.pillars*`.

**Mobile PWA UX foundations (2026-09-28):** Applied checklist 1A+2B on landing/auth/angler/operator/offline: spacing 4/8/16/24/32 + type 12/14/16/20/28, 44px defaults, safe-area top, no maxScale lock, Empty/Error/Skeleton/OfflineBanner, route error/loading/not-found, keyboard-safe auth forms, list fade-in. Local only — push when ordered.

**Fleet mobile cards (2026-09-28):** Handler Fleet (`/handler/boat`) no longer uses a horizontally scrolling table on phone widths. Mobile shows a stacked list (name, reg, owner, capacity, status); `md+` keeps the table.

**Operator Today search button (2026-09-28):** Today toolbar keeps On water / All today on the left; search is an icon button on the right that expands the field only when needed.

**Clean project base (2026-09-28):** Removed unused legacy booking UI, orphan revenue/earnings pages, dead payment/admin wrappers, unused shadcn components, starter/superseded brand assets, and the unused `cn` npm package. Dropped the public `AUTH_SECRET` compose fallback (Dokploy / `.env` must set it). Added named volume `tiangpass_photos` at `/app/data/photos` so e-KYC photos survive redeploys; entrypoint chowns the mount then runs as `nextjs`.

**Stripe primary + Admin gateway (2026-09-24):** Admin Ops → Payment gateway selects primary checkout: `stripe` (default), `hitpay`, or `mock`. Resolution: Admin setting + env keys; missing keys fall back to mock. Stripe Checkout Sessions + webhook `POST /api/webhooks/stripe` on **`checkout.session.completed`** (also `checkout.session.async_payment_succeeded`). Return URL confirms via `session_id` (Stripe API) so passes activate even if the webhook event type was wrong. Pass detail recovers PENDING + stored `cs_*` session. Mock Pay buttons always remain as Demo / fallback. Dokploy: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook URL `{APP_URL}/api/webhooks/stripe` must listen to **`checkout.session.completed`** (not only `payment_intent.succeeded`). Redeploy after env change.

**HitPay sandbox payments (2026-09-24):** HitPay available when Admin selects HitPay and `HITPAY_API_KEY` is set. Sandbox MYR methods default `grabpay_direct,shopee_pay,atome`; production later uses `fpx,duitnow` via env. Pass activates only on HMAC-verified webhook `POST /api/webhooks/hitpay`. See `.env.example`.

**Operator Today glance + Account locale (2026-09-24):** Removed duplicate EN/BM on Account (shell top bar / sidebar only). Operator Today replaces two wide tables with glance tiles (checked in now + this operator’s distinct check-ins today from `scan_events`, MYT day) plus On water / All today chips and phone-width pass cards.

**Dokploy + GHCR CI (2026-09-24):** GitHub Actions builds the app image and pushes `ghcr.io/iyazibrahim/portmaster`, then calls Dokploy `compose.deploy` / `application.deploy` (secrets `DOKPLOY_*`). No manual VPS script. Dokploy compose command must **not** use `--build` (pull + up only) or the 4GB host OOMs again. Local builds: `docker-compose.build.yml` overlay.

**Storage optimization (2026-09-24):** e-KYC capture prefers WebP @480px (JPEG fallback); server re-encodes with `sharp` and overwrites one file per user (`{userId}.webp`). Account delete removes photos. Cleanup job purges expired sessions, stale QR/boarding/verification tokens (14d graveyard for used/revoked), and audit rows older than **1 year**. Run `npm run db:cleanup` or `POST /api/cron/cleanup` with `CRON_SECRET`; Admin Ops also triggers at most once/day. Audit `metaJson` sanitized + capped at 2KB.

**Admin list refresh + boarding JSON (2026-09-23):** F3 pillar “not saved” was stale SSR after create (DB OK). Admin People/Pillars/Jetties/Boats/Operators call `router.refresh()` after save. Pillar unique (jetty+side+number) returns a clear error. F2: `/api/boarding/preview|scan` always return JSON `{ok,error}` on 400 (never HTML).

**Boarding API + live status (2026-09-23):** Scanner preview/confirm use stable `/api/boarding/*` (not hashed Server Action IDs) so redeploys don’t break open scan tabs. SoftLiveRefresh listens for scan events; Active/Checked-In pass detail polls every 20s. Optional `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for other Server Actions across instances.

**OOM guard soft refresh (2026-09-23):** SoftLiveRefresh default 60s + in-flight lock (was 12s); removed from My Passes. Ops/passes 60s, handler Today 45s — cuts RSC/DB thrash under 512MB heap / 768m container.

**Pass detail UX cleanup (2026-09-23):** Overnight intention is a teal button + dialog (shadcn Calendar) *after* pass info; Self check-out after actions. Action buttons use equal 2×2 grid (`gap-3`) so labels don’t truncate/overlap — Overnight · Download · Change pillar · Cancel (red).

**Cancel to change pillar (2026-09-23):** Anglers change pillar by cancelling `ACTIVE`/`PENDING_PAYMENT` (Change pillar / Cancel pass on pass detail, My Passes, buy gate) then buying again — fee non-refundable. Not after check-in. `actionCancelPass` revalidates pass/trips/ops.

**Overnight self-checkout Phase B (2026-09-22):** Implemented jetty-geofenced angler self-checkout + shore/liability declaration; optional `intends_overnight` / `expected_return_on` (not multi-day pass). Migration `0009_overnight_intention`. Phase C remote claimed-ashore still deferred.

**Overnight self-checkout plan (2026-09-22):** Product direction locked — **Phase B now** (jetty-geofenced angler self-checkout + shore/liability declaration + optional expected-return intention; not multi-day purchase), **Phase C later** (remote claimed-ashore + ops confirm). Spec: `docs/superpowers/specs/2026-09-22-overnight-self-checkout-design.md`. Plan: `docs/superpowers/plans/2026-09-22-overnight-self-checkout.md`.

**Live status + silent offline (2026-09-22):** Scan revalidates ops/passes/handler/trips/pass (not `/handler/scan`). Soft 12s `router.refresh` on ops, passes, handler Today. Scanner badge updates briefly on confirm. Offline pack banner only when offline or queued scans remain; online pull/sync runs silently.

**Full EN/BM UI pass (2026-09-22):** Signup form, admin ops KPIs/widgets, People/Operators/shared pagination, admin page titles, handler Today/Fleet/Earnings chrome wired to `en.json`/`ms.json` (331 keys, parity). DB entity names and some dialog toasts still English.

**Operator edit + optional licence (2026-09-22):** Admin can edit boat operators on **Operator Bot** (display name, jetty, owner, optional `handlers.licenseNo`). Same fields editable when creating/updating Operator role under People. Both paths update the same handler row. Operator licence ≠ boat permit (`boats.licenceInfo` / `permitExpiresAt`).

**Desktop signup + SRS age gate (2026-09-22):** Signup card spacing/alignment tightened (balanced two-column grid, full-width password + address, scrollable form). Live age from MyKad YYMMDD or DOB; `MIN_AGE=14` blocks submit with clear alert when under 14 (client + existing server `validateAnglerIdentity`). LocaleSwitcher on login/signup.

**Responsive + full EN/BM (2026-09-22):** Viewport polish at 375/768/1024/1440 (tables stay tables: sticky first column, single overflow, KPI stacks, pillar carousel 6 bars on `<sm`). Full EN/BM UI via expanded `en.json`/`ms.json`, `LocaleProvider`/`useT`, wired nav + scan + key surfaces. Status badges translate known enums.

**Offline CI/CO phased (2026-09-22):** Flaky + true offline boarding for operators/admin/anglers. `scan_events.client_event_id` (migration `0008`) makes scan retries idempotent. Scanner IndexedDB queue + timeout flush; **Refresh offline pack** pulls today’s Active/Checked-In passes (photos inlined) for zero-signal CI/CO; sync marks `conflict_flag` for Admin at `/admin/sync-conflicts`. Anglers cache pass+QR via `PassWalletCache`; SW v5 warm-cache + `/pass/[id]/offline`. No offline purchase.

**Anglers-per-Pillar carousel (2026-09-22):** Dashboard chart pages **12** bars at a time with left/right arrows; last page pads empty slots so bar width stays stable. Shows all open pillars (no longer capped at 12). Counter `1–12 of N` when more than one page.

**Pass receipt + letterhead (2026-09-22):** Paid passes open `/pass/[id]/receipt` (A4 print / Save as PDF) with admin-configurable letterhead (org name, tagline, address, reg no, phone, email, footer, logo upload). Includes boarding QR when Active/Checked-In. Settings → **Receipt / letterhead**. Defaults in seed; logo falls back to `/brand/tiangpass-logo.png`.

**Official logo (2026-09-21):** `TiangPass Logo.jpg` white backdrop removed (flood-fill) → transparent `public/brand/tiangpass-logo.png`; favicon / PWA icons / `BrandLogo` on landing, auth, nav, install banner. New fishing illustration is cache-busted **brush-edge** `tiangpass-scene-brush.png` (no metallic badge) on marketing + login/signup.

**Operator scanner (2026-09-22):** Multi-pass flow: `ensureLiveCamera()` after confirm / scan another; mobile **Open camera** (user gesture, no auto `getUserMedia` on mount). Larger 4:3 scan box (~96% of the frame, 480px decode). Admin **Settings → Jetty GPS check** can turn off jetty radius for testing. Check-in no longer remounts `/handler/scan`.

**Scanner bind-before-decode (2026-09-22):** First Open often failed to detect QR because decode started before `srcObject`/`play()`, and Chrome `BarcodeDetector` could hang with no jsQR fallback. Open now binds → awaits play + `videoWidth` → then decodes. jsQR always runs; native detector is optional with a 400ms timeout. Continuous AF when supported. Video stays mounted (`opacity-0`, never `display:none`) so WebKit gets real dimensions.

**Scanner detect reliability v2 (2026-09-22):** Stop→Open was still required. Root causes: (1) decode loop scheduled only via `requestVideoFrameCallback` could stall after one tick; (2) Open reused a soft-hub stream that previewed but would not decode; (3) black warmup frames. Fix: show video first, rebind `srcObject`, 450ms warm-up, **setInterval jsQR-only** decode, Open button always `forceNew` hard stream, 1280×720 + continuous AF, skip near-black frames.

**Scan check-in + camera permission (2026-09-21):** `actionScanToken` no longer calls `revalidatePath`. Camera hub soft-release (30 min) reuses live streams across remounts. **Open camera** is manual (paste check-in works without camera). After each confirm, `ensureLiveCamera()` + resume decode for multi-pass. Scan/preview return `{ ok, error }` for GPS/jetty messages.

**Ops dashboard / alerts / payments (2026-09-22):** Anglers-per-Pillar bar colors match Pillar Status (occupied = amber, at capacity = emerald). Long stays use **Still under bridge** on dashboard (`overdue_hours` from settings); no auto `OVERDUE_CHECKIN` alert spam (boat permit, failed pay, incidents unchanged). Alerts & incidents tables paginate **5**/page; dashboard alert/incident widgets cap at 5 + link to `/admin/alerts`. Payments: jetty filter beside search; KPI row **Monthly collected** (MYT MTD) + today + paid/pending/failed (5 cards).

**Admin UX scale (2026-09-21):** Shared `AdminDataTable` (search, `min-h-11`, 15/page default) + `StatusBadge` traffic lights (no underscore labels). Passes / Boats / Operators / Pillars / Jetties / Payments / Audit use the shell. Alerts auto-refresh (boat permit ≤30d, failed pay) + resolve; incidents create + status flow. Reports live KPIs + equal-height controls. Settings bento for pass ops; IT unlock retained.

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
- Migrations: Docker/Dokploy boot applies `0000` + `0002` then `0004`–`0008` via `scripts/apply-srs-mvp1.ts`.

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

**Admin ghost user / FK (2026-09-22):** Boot logs showed `sessions` FK 23503: selected admin id `usr_vOPUZFlAshyIRhZV` was not present in `users` for the FK check (stale FK OID / search_path shadow / orphan). `ensure-demo-ops` now forces `search_path=public`, refreshes collation, deletes orphan sessions, recreates `sessions_user_id_users_id_fk` → `public.users`, rebuilds demo admin, and probes session insert. Login uses `public.users` / `public.sessions` only.

**Login Date TypeError (2026-09-22):** Next.js + postgres.js `prepare: false` interpolated a JS `Date` into session INSERT. The bundled encoder writes params with `utf8Write`, so Date throws `ERR_INVALID_ARG_TYPE`. Login and boot probe now bind ISO `timestamptz` strings (`asSqlTimestamp`). Alpine/musl collation warning (`no actual collation version, but a version was recorded`) is cleared on boot when libc reports no version.

**Account status UI + pass 503 (2026-09-22):** Status dialog used SearchableSelect (search + portaled menu) which overlapped itself inside the transformed dialog. Status is now a stacked Active / Suspended / Blacklisted picker. Service worker was intercepting Next.js RSC/`/_next` fetches and returning `503 Offline`, which broke `/pass/[id]`. SW v4 only precaches the public shell and only handles real navigations when the network is down.

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

If build still OOMs, use GitHub Actions + Dokploy pull-only deploy (no `--build` in Dokploy compose command).


Validated: empty Postgres 16 → apply (users/jetties/passes) → apply again (idempotent) → seed.

Seed on Docker uses `node --experimental-strip-types` (no tsx). Relative imports in `src/db/seed.ts` must include `.ts` extensions (`./schema.ts`, `../lib/utils-app.ts`) and not import `./index` (Node ESM cannot resolve extensionless paths).

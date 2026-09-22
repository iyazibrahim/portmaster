# Overnight jetty self-checkout (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `CHECKED_IN` anglers self-check-out at the boarding jetty (geofence + shore declaration), with optional overnight expected-return intention — without multi-day purchase or remote checkout.

**Architecture:** Extend pass domain + schema with overnight intention fields; add `selfCheckOutPass` server action mirroring operator checkout transitions and geofence; surface declaration + GPS CTA on pass detail. Phase C (claimed-ashore) is explicitly out of scope for this plan.

**Tech Stack:** Next.js App Router, Drizzle/Postgres, existing `assertWithinGeofence`, Auth.js sessions, Vitest domain tests, EN/BM i18n catalogs.

**Spec:** [docs/superpowers/specs/2026-09-22-overnight-self-checkout-design.md](../specs/2026-09-22-overnight-self-checkout-design.md)

## Global Constraints

- Same-day purchase only (`validOn === today MYT`); no advance/multi-day passes.
- Self-checkout requires jetty geofence (respect `require_jetty_geofence`); Admin bypass does **not** apply to anglers.
- Operator/Admin QR scan checkout must keep working unchanged.
- Phase C remote claimed-ashore is deferred — do not add that status yet.
- EN + BM strings for any new angler/ops copy.
- Prefer domain helpers in `src/domain/pass.ts` with Vitest coverage before wiring DB actions.

## File map

| File | Responsibility |
|------|----------------|
| `src/db/schema.ts` + migration | `intendsOvernight`, `expectedReturnOn`, optional self-checkout audit columns |
| `src/domain/pass.ts` / `pass.test.ts` | Eligibility + overnight intention validation |
| `src/lib/pass.ts` | `selfCheckOutPass`, persist intention, scan event/audit |
| `src/lib/actions/pass.ts` | Server actions for intention + self-checkout |
| `src/app/(app)/pass/[id]/page.tsx` + new client component | Declaration UI + GPS + CTA |
| `src/components/pass/pass-wizard.tsx` | Optional overnight checkbox at purchase |
| `src/i18n` catalogs | EN/BM copy |
| `OPEN_QUESTIONS.md` / `workflow.md` | Lock product decision |

---

### Task 1: Domain rules + tests

**Files:**
- Modify: `src/domain/pass.ts`
- Modify: `src/domain/pass.test.ts`

- [x] Add helpers, e.g.:
  - `assertCanSetOvernightIntention({ validOn, expectedReturnOn, maxNights })`
  - `canSelfCheckOut({ status })` → true only for `CHECKED_IN`
  - `nextStatusAfterSelfCheckOut` → same as checkout (`CHECKED_OUT`)
- [x] Cap expected return (default max 3 nights from `validOn`, MYT date strings).
- [x] Write failing Vitest cases, then implement until green.
- [x] Commit: `Add overnight intention and self-checkout domain rules`

### Task 2: Schema

**Files:**
- Modify: `src/db/schema.ts`
- Add: migration script under existing `scripts/apply-srs-mvp1.ts` pattern (next migration id after `0008`)

- [ ] Add nullable/boolean fields on `passes`:
  - `intendsOvernight` boolean default false
  - `expectedReturnOn` text null (`YYYY-MM-DD` MYT)
  - `selfCheckedOutAt` timestamp null (optional; can reuse `checkedOutAt` + audit only — prefer **reuse `checkedOutAt`** and record method in audit/scan metadata to avoid duplicate truth)
- [ ] Prefer lean schema: only `intends_overnight` + `expected_return_on`; checkout method via `scan_events` / audit payload (`method: "SELF" | "OPERATOR"`).
- [ ] Apply migration path used by Docker boot.
- [ ] Commit: `Add overnight intention columns on passes`

### Task 3: Server self-checkout + intention APIs

**Files:**
- Modify: `src/lib/pass.ts`
- Modify: `src/lib/actions/pass.ts`
- Modify: `src/lib/audit.ts` (label for new action)

- [ ] `updateOvernightIntention(passId, userId, { intendsOvernight, expectedReturnOn })` — owner only; allowed for `ACTIVE` or `CHECKED_IN`.
- [ ] `selfCheckOutPass({ passId, userId, lat, lng, shoreDeclarationAccepted })`:
  - Require declaration accepted
  - Load pass + jetty; geofence like scan (`purpose: "boarding"`)
  - Transition via domain helper; set `checkedOutAt`
  - Insert `scan_events` `CHECK_OUT` with actor user id, no handler (or null handler), metadata/method `SELF`
  - Audit `pass.self_check_out`
- [ ] Wire thin server actions returning `{ ok, error }` for the client.
- [ ] Commit: `Add angler jetty self-checkout server action`

### Task 4: Pass detail self-checkout UI

**Files:**
- Add: `src/components/pass/self-checkout-panel.tsx` (client)
- Modify: `src/app/(app)/pass/[id]/page.tsx`
- Modify: `src/i18n` EN/BM JSON

- [ ] When `CHECKED_IN`, show panel: expected return (if set), shore checkbox, liability copy, **Check out at jetty** button.
- [ ] Request GPS; call self-checkout action; show geofence errors inline.
- [ ] Keep QR block for operator fallback.
- [ ] In-app reminder banner if `today > expectedReturnOn` or overdue hours exceeded.
- [ ] Commit: `Add geofenced self-checkout panel on pass detail`

### Task 5: Optional purchase / post-CI intention UI

**Files:**
- Modify: `src/components/pass/pass-wizard.tsx`
- Modify: pass create path in `src/lib/pass.ts` / actions
- Modify: pass detail (edit intention while checked in)

- [ ] Checkbox: “I may stay overnight” → date select default tomorrow.
- [ ] Persist on create after payment success fields (or update right after activate).
- [ ] Allow editing intention on pass detail while `ACTIVE`/`CHECKED_IN`.
- [ ] Commit: `Collect overnight stay intention at purchase`

### Task 6: Ops visibility + docs lock

**Files:**
- Modify: dashboard overdue / still-under-bridge mapping if cheap (`src/lib/dashboard.ts` + admin/LLM widgets)
- Modify: `OPEN_QUESTIONS.md`
- Modify: `workflow.md`

- [ ] Show expected return on overdue rows when present.
- [ ] Lock table row: Phase B self-checkout at jetty; Phase C claimed-ashore later; multi-day purchase still out of scope.
- [ ] Commit: `Document overnight self-checkout Phase B decision`

### Task 7: Validate

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual: check-in via operator → angler self-checkout inside radius → outside radius fails → operator checkout still works on another pass
- [ ] Commit any fixes; push branch; update PR

---

## Phase C (deferred — do not implement here)

1. `claimedAshoreAt` / ops confirmation queue  
2. Remote declaration without geofence  
3. Grace auto-confirm setting  
4. Web Push reminders  

Track as a follow-up issue after Phase B ships and real dead-phone-at-home volume is known.

## Test plan (Phase B)

1. Domain: intention date bounds; self-checkout only from `CHECKED_IN`.
2. Action: missing declaration → error; missing GPS → error; outside radius → error; inside → `CHECKED_OUT` + occupancy freed.
3. Operator scan after self-checkout → rejected/no-op appropriately.
4. Purchase still rejects non-today `validOn`.

# Overnight self-checkout — design

**Status:** Approved direction (B now, C later)  
**Date:** 2026-09-22  
**Product:** TiangPass

## Problem

Anglers may stay overnight under a pillar after operator check-in. Checkout today requires an operator QR scan at the jetty. If the angler’s phone dies, they cannot show the QR, and few carry a printed receipt. Pillar capacity and “still under bridge” stay wrong until someone checks them out.

## Goals

1. Let overnight / multi-night *stayovers* self-check-out safely when they return to shore.
2. Keep pillar occupancy and safety lists trustworthy (GPS proof, not a checkbox alone).
3. Avoid turning same-day passes into multi-day purchases.
4. Leave a path for remote “claimed ashore” recovery later (Phase C).

## Non-goals (Phase B)

- Multi-day / advance pass purchase
- Remote checkout from home/car without jetty GPS
- Web Push as a required dependency
- Physical receipt / printed boarding pass
- Changing Association fee or one-pass-per-day purchase rules

## Decision

| Phase | Name | Rule |
|-------|------|------|
| **B (now)** | Jetty-geofenced angler self-checkout | Angler may self-check-out only while `CHECKED_IN`, after shore declaration + liability accept, **and** device GPS is inside boarding-jetty geofence. Operator scan remains the primary / fallback path. |
| **C (later)** | Claimed-ashore hybrid | Remote declaration creates `CLAIMED_ASHORE` (or equivalent); slot frees only after operator/Admin confirm or grace auto-confirm. |

## Current baseline (do not break)

- Same-day purchase only (`validOn === today MYT`).
- Unused `ACTIVE` → `EXPIRED` after calendar day; `CHECKED_IN` never auto-expires by date.
- Occupancy held by `PENDING_PAYMENT` / `ACTIVE` / `CHECKED_IN`.
- Operator/Admin scan: `ACTIVE → CHECKED_IN → CHECKED_OUT` with jetty geofence (Admin bypass).
- Overdue = dashboard list (“Still under bridge”); no hard fishing time cap.

## Phase B design

### Overnight intention (not a multi-day pass)

Optional flag on the pass: **intends overnight / expected return date**.

- Collect at purchase **or** after check-in (anglers often decide later).
- Does **not** extend purchase validity, fee, or slot reservation rules.
- Used only for UX copy, reminders, and ops visibility (“expected return”).
- Default expected return = next calendar day MYT; allow select up to a small admin cap (e.g. 3 days from `validOn`).

### Self-checkout eligibility

Allowed when all are true:

1. Pass `status === CHECKED_IN`
2. Actor is the pass owner (Angler)
3. Angler ticks: already on shore + accepts responsibility if false
4. Device GPS passes `assertWithinGeofence` for boarding jetty (`purpose: "boarding"`), same toggle as operator scan (`require_jetty_geofence`)
5. Result: `CHECKED_IN → CHECKED_OUT`, set `checkedOutAt`, write audit + `scan_events` row with type `CHECK_OUT` and actor = angler (distinct from operator handler id)

Denied otherwise with clear copy: move within jetty radius, or ask an operator to scan.

### Dead phone / no print

| Situation | Phase B behaviour |
|-----------|-------------------|
| Phone dead at jetty | Charge at car/home, return to jetty, open pass in PWA, self-check-out inside geofence |
| Phone dead, angler already home | Cannot self-check-out in B; open pass later and return to jetty, or call/ops → operator/Admin force checkout |
| No paper receipt | Digital pass + QR in app / offline wallet remains source of truth |
| Reminder | In-app banner on pass detail + soft refresh when `CHECKED_IN` past expected return / overdue hours. Optional local Notification API if permission already granted. **Web Push deferred** (unreliable after battery death unless subscription existed). |

### Operator path unchanged

Operators keep scanning the same QR for check-out. Self-checkout is additive, not a replacement.

### Audit & ops

- Audit action e.g. `pass.self_check_out` with lat/lng distance metadata.
- Dashboard “Still under bridge” unchanged except show overnight intention / expected return when set.
- No auto-alert spam (align with current overdue list-only policy).

## Phase C (later) — sketch only

Do **not** implement in the B plan.

1. New intermediate status or flag: `claimedAshoreAt` + `claimedAshoreBy` (or status `CLAIMED_ASHORE`).
2. Remote declaration + liability from anywhere when `CHECKED_IN` and (optionally) past expected return.
3. Pillar occupancy: decide explicitly — either still occupied until confirm, or soft-release with conflict risk. **Recommended:** still occupied until confirm/grace so capacity stays honest.
4. Ops queue: confirm → `CHECKED_OUT`, or reject → back to `CHECKED_IN`.
5. Grace auto-confirm after N hours (admin setting), with audit trail.
6. Then reconsider Web Push for “confirm you are ashore” nudges.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Spoofed GPS | Same trust model as purchase/operator scan; accept for MVP; Admin can reverse via audit |
| Lie while still under bridge | Geofence makes casual remote lie harder; liability checkbox for accountability |
| Angler never returns to jetty | Phase C; until then Admin/operator force checkout from overdue list |
| Confusion with multi-day passes | Copy: “overnight stay intention” / “expected return”, not “pass valid until” |
| Push dependency | Not required for B |

## Success criteria (Phase B)

- Checked-in angler inside jetty radius can self-check-out after declaration.
- Outside radius / missing GPS → blocked with clear error.
- Operator scan still works for the same pass.
- Occupancy frees on self-checkout (`CHECKED_OUT` not in occupancy set).
- Overnight intention never allows buying future dated passes.

# TiangPass — open questions & assumptions

Aligned to the 21 Sep PRD pack with product decisions locked in workshop (2026-09-21).

## Locked (current product)

| Topic | Decision |
|-------|----------|
| Angler boat booking | **Disabled.** Pass purchase only. Boat hire is outside the app. |
| Scan authorisation | Operator: **registered jetty only**. Admin: **anywhere**. No boat pick at scan. |
| Accountability | Log **which operator** did drop-off vs pick-up. Boat is fleet master data only. |
| Owner vs handler | Owners have login accounts. Handlers are staff under an owner (or the same person). Many boats / many handlers per owner. |
| Geofence | Enforce on **purchase + check-in + check-out** for anglers/operators. **Admin bypasses.** |
| Overnight | Unused **Active → Expired** at end of calendar day (slot frees). **Checked-In stays** until checkout (including next day). No fishing duration cap. |
| Offline CI/CO | **Phased (locked 2026-09-22).** Phase 1: flaky-network queue + idempotent `clientEventId`. Phase 2: jetty day-manifest + local apply + sync with Admin conflict review. Angler pass wallet is **read-only offline** (cached QR). No offline purchase. |
| Scan UX | **Camera + paste.** Show angler photo. No MyKad/mobile fallback lookup yet. |
| Photo | **Required at signup.** Shown to operator at scan. |
| Capacity | **Per-pillar MAX**, Admin-editable (default 4). |
| Pillar status | Available, Unavailable, Temporarily Closed, Under Maintenance, Restricted. Only **Available** sells. |
| Boat status | Active, Inactive, Suspended, Permit Expired, Under Maintenance. Only **Active** + valid licence is operational. |
| Payment | **Mock UI + `PaymentProvider`** so any gateway can drop in later. |
| Identity | **Form signup now.** MyDigital ID later. |
| Blacklist | Admin can suspend / blacklist / reactivate + reason. Blocked cannot buy. |
| Language | **Real BM / EN switch.** |
| LLM | View-only dashboards with real sub-pages. |
| Reports | Pass-based Excel/CSV. PDF later. |
| Receipts | On-screen + **downloadable**. No email yet. |
| Audit | Write on sensitive Admin/operator actions. |
| Safety | Overdue **list** on dashboards only. No SOS. No time-limit enforcement. |
| Legacy booking | **UI hidden.** DB tables retained. |
| Fee | RM5 Association (`association_fee_cents=500`), non-refundable. |
| Reservation | Default **10 minutes**. |
| Operating hours | Per jetty, default **06:00–18:00** MYT. |

## Still later (do not build yet)

- Real payment gateway (provider TBD)
- MyDigital ID / e-KYC
- Receipt email
- PDF reports
- SOS / emergency alert
- QR fallback by MyKad / mobile / pass ref
- Deleting legacy booking tables
- Boat selection at scan

## Out of scope

Foreign anglers; buying for someone else; advance/multi-day; multi-pillar pass; boat fare in-app; native apps; pillar-side QR; boat passenger-capacity enforcement; multi-Association; LLM editing pillars.

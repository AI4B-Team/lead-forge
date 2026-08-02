---
name: Team accountability model
description: Roles, per-member credit/export caps, approval thresholds, attributed audit log vs compliance log, seat revocation
type: feature
---
Roles: Owner/Admin (full: billing, members, suppression, deletion), Member (build, send, export within caps), Viewer (read-only — never spends, never exports).

Foundational on every plan: roles + the attributed activity log (actor_id on activity_events).
Team/Business plans only: per-member monthly credit caps, export row caps, approval thresholds, anomaly alerts, per-member cost dashboard.

Two separate logs, never merged:
- Attributed activity log (internal accountability — who spent, who exported) on the Team page.
- Compliance audit log (external legal evidence — opt-outs, blocked sends) on the Compliance page.

Exports are always logged with member + timestamp + row count, and watermarked with the exporting member's name/time in the filename plus a footer row.
Seat revocation forces sign-out of open sessions (SeatGuard polls checkSeatRevoked).
Enforcement is server-side in accountability.server.ts; client gating is convenience only.

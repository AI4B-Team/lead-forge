---
name: Real Elite identity spine
description: Real Elite is the canonical IdP; LeadTrace federates via 60s HS256 handoff tokens and nullable canonical IDs
type: feature
---
Real Elite is the canonical identity/org source for the app family. LeadTrace federates — no database merges, standalone auth always keeps working.

- Canonical IDs: `workspaces.real_elite_org_id` (unique when set) and `user_prefs.real_elite_user_id`. Null = standalone.
- SSO handoff: hub mints a 60s HS256 JWT `{reo_org_id, reo_user_id, email, name, org_name, role, exp}` signed with `REAL_ELITE_HUB_SECRET` → `/auth/hub?token=...` → verified at `/api/public/hub/callback` → local user/workspace upserted → normal local session.
- Account linking: Settings → "Connect To Real Elite" stamps IDs in place, no data movement.
- All webhook event payloads include `real_elite_org_id` when linked.
- Billing stays per-app. Linking is additive, never required for any launch.

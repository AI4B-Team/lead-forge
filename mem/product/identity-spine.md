---
name: Real Elite identity spine
description: App-family integration contract — Real Elite is canonical IdP, shared HUB_SIGNING_SECRET, standard event names, API-first actions
type: feature
---
Family-wide contract (identical in Real Elite, LeadTrace, Master Closer, and every future à-la-carte app). Federation only — never merge backends or migrate auth; never gate standalone signup/login on hub availability; never invent per-app variants of event names, JWT fields, or `/auth/hub` behavior.

- Canonical IDs: `workspaces.real_elite_org_id` (unique when set) and `user_prefs.real_elite_user_id`. Null = standalone.
- SSO handoff: hub mints a 60s HS256 JWT `{reo_org_id, reo_user_id, email, name, org_name, role, exp}` signed with `HUB_SIGNING_SECRET` — the SAME secret value in every app, distributed manually, never generated per app → `/auth/hub?token=...` → verified at `/api/public/hub/callback`.
- Resolution order at `/auth/hub`: match `real_elite_user_id` → sign in; else match `real_elite_org_id` → create the user inside that org; else create org (`org_name`) + user and stamp both IDs; then a normal local session.
- Account linking: Settings → "Connect To Real Elite" stamps IDs in place, no data movement.
- Events: `job.completed`, `leads.new`, `lead.flagged_dnc`, `lead.flagged_litigator`, `campaign.launched`, `message.reply_received`, `brand.approved`, `credits.low` — exact names, payloads carry `real_elite_org_id` when linked.
- API-first: every UI action is also an authenticated endpoint under `/api/public/v1/*` (jobs list/create/run, job status, leads, campaigns list + push list to campaign) authorized by a Supabase bearer token. The hub consumes these; it never rebuilds them.
- Billing stays per-app. Linking is additive, never required for any launch.

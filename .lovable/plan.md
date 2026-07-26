# LeadForge — Phased Build Plan

You picked **Scaffold full UI shell + all routes (no backend yet)**. Here is the phased plan to get there. Everything below is frontend + mock data; Lovable Cloud (Supabase), scraping adapters, Stripe, and edge functions come in later phases once you approve this shell.

## Phase 1 — Brand + design system foundation

- `src/config/brand.ts` — `BRAND_NAME`, `BRAND_ACCENT`, `BRAND_DOMAIN` (single source of truth per Part 6).
- `src/styles.css` — add semantic tokens in `oklch` matching the spec:
  - `--primary` = #CC0000 (accent red), `--primary-hover` = #A30000
  - `--ink` = #0E0E10 (dark hero/cards), surfaces #FFFFFF and #F6F6F7
  - `--highlight` = #F5D547 (marker highlight)
  - `--success` #16A34A, `--warn` #F59E0B, `--danger` #DC2626
  - `--border` #E6E6E8, radius 16px cards, pill buttons
- Fonts: Playfair Display (display) + DM Sans (body) via `<link>` in `__root.tsx` head.
- shadcn Button variants: `hero` (red pill), `secondary-dark`, `ghost-dark`.
- Utility component: `<MarkerHighlight>` wraps a hero word with the yellow hand-drawn underline.
- Copy guardrails documented in a top-of-file comment: Title Case everywhere, no em-dashes, no gradients, Lucide icons only.

## Phase 2 — Marketing site (replaces placeholder `/`)

Routes created in `src/routes/`:

```text
/                 index.tsx        Home (hero + how it works + features + industries + pricing + compliance)
/how-it-works     how-it-works.tsx
/features         features.tsx
/industries       industries.tsx
/pricing          pricing.tsx
/compliance       compliance.tsx
/sign-in          sign-in.tsx      (mock, no auth yet)
/start            start.tsx        (mock signup, routes into /app)
```

Shared marketing chrome (nav + footer) lives in a `MarketingLayout` component used by all marketing routes. Each route has its own `head()` with unique title/description/og.

Hero implements the spec exactly:
- Dark `#0E0E10` background
- Eyebrow "Leads To Deals, On Autopilot" + Lucide `Sparkles`
- H1 Playfair: "Find Them. Reach Them. Close Them." with `Reach Them.` in yellow marker highlight
- Right side: animated pipeline card stack (CSS/Framer Motion) cycling through Scraped → Skip Traced → Clean/DNC/Litigator counts → Campaign Live

Pricing uses the 3-card layout with red "Most Popular" ribbon on Growth.

## Phase 3 — App shell (`/app` subtree)

Routes:

```text
/app                            _app.tsx layout (sidebar + header)
/app                            _app.index.tsx  → redirect to /app/dashboard
/app/dashboard                  4 metric cards + credit widget + recent jobs table
/app/new-job                    three-door picker
/app/new-job/business           Door A wizard (niche + geography + filters)
/app/new-job/records            Door B wizard (record type + county + date range)
/app/new-job/upload             Door C wizard (dropzone + column mapper)
/app/jobs/$jobId                Pipeline Review (rows in, deduped, enriched, skip traced, 3 buckets + Launch button)
/app/lists                      Lists table
/app/campaigns                  Campaigns table + create flow
/app/campaigns/$campaignId      Campaign detail (steps, deliverability, inbox)
/app/numbers                    Number pool + health scores
/app/compliance                 10DLC registration status + audit logs + suppression list
/app/settings                   Workspace + industry preset + team
/app/billing                    Plan + credit balances + top-ups (mock)
```

Sidebar (Lucide icons): Dashboard, New Job, Lists, Campaigns, Numbers, Compliance, Settings, Billing. Collapsible with `shadcn/ui sidebar`, `SidebarTrigger` in the header (always visible).

All screens render from `src/lib/mock-data.ts` — realistic sample jobs, leads, campaigns, numbers, ledger entries. No backend, no API calls yet.

## Phase 4 — Not built in this pass (deferred)

These require Lovable Cloud + provider integrations and will be follow-up turns:

- Supabase schema + RLS (Part 4.1)
- Edge functions: run-job, source-*, enrich-dedupe, skiptrace, scrub, campaign-runner, inbound-webhook, register-10dlc, stripe-webhook
- Provider adapters: Outscraper, BatchData, DNCScrub, Twilio/Telnyx
- Stripe checkout + metered credits
- 10DLC registration workflow
- Real STOP handling + suppression enforcement

## Technical notes

- TanStack Start file-based routing; every `createFileRoute("/...")` matches the filename precisely.
- `__root.tsx` stays as the sole root layout. Marketing routes use a shared `MarketingLayout` component (not a file-based layout). The `/app` subtree uses a real file-based layout route `_app.tsx` rendering `<Outlet />` inside `SidebarProvider`.
- `head()` metadata on every content route (title, description, og:title, og:description, og:type). Root gets stripped of the placeholder "Lovable App" title.
- No colors hardcoded in components — everything reads from tokens in `src/styles.css`.
- `src/routes/index.tsx` placeholder is replaced by the real marketing home page.
- `public/robots.txt` + `src/routes/sitemap[.]xml.ts` added at the end covering all public routes.

## Deliverable

A fully clickable frontend where every marketing page and every app screen exists with mock data, matching the spec's tokens, copy rules, and information architecture. Ready to layer Cloud + adapters on top.

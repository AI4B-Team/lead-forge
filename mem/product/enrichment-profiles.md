---
name: Enrichment profiles by source category
description: Creator vs B2B vs standard enrichment defaults, funnel stage naming, estimates, and export columns per source
type: feature
---
Enrichment options are per-category, never one global rule (`src/lib/pipeline-options.ts`).

- Creator sources (tiktok, tiktok-hashtag, instagram, instagram-hashtag, youtube, youtube-search, pinterest): hide Skip Trace Missing Numbers and Mobile Numbers Only entirely. Show "Only Creators With Contact Email" (default ON, checklist label "Email Required"). Estimates exclude skip-trace credits. Funnel replaces the verify stage with "Email Found" (delta = creators dropped for missing contact info) and never renders "Mobile Verified" or "Skip Traced". Clean-file columns are creator-shaped: handle, platform, followers, engagement, email, profile URL.
- LinkedIn / B2B: Skip Trace stays visible but defaults OFF, hint "Find direct dials for decision-makers (uses skip-trace credits)."
- Business and public records: unchanged, phones are the product.
- Dedupe is universal.

Assistant behavior: for creator sources never offer skip tracing or mobile filtering. If asked for creators' phone numbers, explain that creator outreach runs on email/DM and cold-texting individuals raises TCPA consent issues LeadTrace won't take on, then offer the email-required list instead.

Waitlist signal: TikTok/Instagram/YouTube requests = email-based creator outreach product; LinkedIn requests = B2B dials product. Two different builds.

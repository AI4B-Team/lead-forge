---
name: Compliance fails closed
description: DNC/litigator scrubbing must never fail open — unconfigured or failing providers hard-fail the run, and unscrubbed numbers are barred from cold outbound
type: constraint
---
Scrubbing is a hard gate, never a best-effort step.

- No mock/simulated scrub may ever stand in for a real one. All mock generators and the
  `LEADTRACE_USE_MOCK_DATA` flag were deleted; mock data lives only in test files.
- Unconfigured (`DNC_API_URL`/`DNC_API_KEY` missing) or a provider error throws
  `DncUnavailableError`. The list run fails and credits refund. **Why:** texting an
  unscrubbed list is the most expensive mistake this product can make.
- A phone the provider returned no verdict for is `scrub_status: 'unknown'` — never
  defaulted to `'clean'`.
- `ScrubStatus = 'clean' | 'dnc' | 'litigator' | 'unknown'`; leads start `'unscrubbed'`.

Send gate (`checkCanText` in `src/lib/optout.server.ts`) — the single chokepoint:
- `dnc` and `litigator` block **every** path, inbound replies included.
- `unscrubbed` / `unknown` / null block **cold outbound only** (campaign, cadence)
  with reason `not_scrubbed`. Manual inbox replies and bot replies on
  consumer-initiated threads stay allowed — a homeowner who texts in must get an answer.

**How to apply:** never add a fallback that invents a scrub verdict, and never widen the
inbound exemption to cold outbound. Locked by `src/lib/optout.test.ts`.

Carrier sends fail closed too: there is exactly ONE dispatch path
(`tickCampaignById` / `tickAllSendingCampaigns` in `src/lib/campaign-runner.server.ts`).
When the SMS provider isn't configured it returns `sms_provider_not_configured` and
writes **no** message rows — never a fabricated `delivered` status.

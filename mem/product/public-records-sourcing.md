---
name: Public records sourcing rules
description: Access-path preference order for county records, CAPTCHA/ToS constraints, and the one-request-per-agency throttle
type: constraint
---
## Access path preference (never reorder)
open data API → county GIS (ArcGIS FeatureServer) → bulk file → public records request → browser automation last.

## Hard constraints
- Never solve a CAPTCHA programmatically — no solving services, no image recognition, no bypass. A human team member registers and signs in, and the captured session is reused until expiry, then flagged for manual re-auth.
- Check each portal's ToS before enabling automation. If it prohibits automated access even for authenticated users, route the county to the records-request path and mark it not permitted in county_coverage.
- Respect robots.txt, identify the bot honestly with a contact URL, one request per 2–3 seconds, back off on 429/503.

## Records requests
- One request per agency per cycle, sent by LeadTrace — never one per user. The returned dataset is distributed to every workspace subscribed to that county. Duplicate automated requests would get our domain ignored by records officers.
- Requests cite the governing state statute (Florida Ch. 119 etc.) and always ask for machine-readable format.
- Auto-parse failures queue for a one-time manual column mapping, remembered per agency permanently.

## Pricing
All public-records paths (open data, GIS, bulk file, records request) have zero marginal cost: credit_cost_per_lead = 0, Free badge.

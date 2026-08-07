# RealeFlow Partner API — live smoke test (2026-08-08)

Ran against `app.realelite.com` with the dev credentials in `.env`
(account 227359, Realeflow Support). Scripts:
`scripts/realeflow-smoke.mjs`, `scripts/realeflow-details-probe.mjs`.

## Verdict: the API is live and the enrichment loop works end to end

| Endpoint | Result |
| --- | --- |
| POST /search | **200.** `places:[{state:"FL",fips:12057}]` → 482,876 Hillsborough properties. Statewide FL → 8.96M. Rows carry the full Property object (owner, mortgages, valuation) plus `address_hash`. |
| GET /details/{hash} | **200.** Fed a hash straight from a search row → 290 fields. Owner name, mailing address, equity/LTV/mortgage balance, absentee flag all present. |
| GET /autocomplete | **200** but address-shaped queries returned 0 suggestions; a place query ("Tampa, FL") returned 1. See caveat below. |

Sample record (real): 8610 MOONLIT MEADOWS LOOP — owner `D R HORTON INC`
(builder inventory), absentee_owner=true, mailing 12602 TELECOM DR.
Exactly the fields our distress-lead enrichment needs.

## Confirmed live: NO owner phone/email

The 290-field details record contains zero phone/email keys. Matches the
docs archive finding. Skip tracing definitively requires a separate vendor;
RealeFlow supplies the skip-trace *inputs* (owner name + mailing address).

## Enrichment chain (now proven, not just planned)

```
scraped distress lead (address)
  → /search with the address text (or /details if we have a hash)
  → owner name, mailing addr, equity, mortgages, absentee, distress flags
  → [skip-trace vendor: name+mailing → phone]   ← missing piece
  → DNC scrub → SMS
```

Note: `/search` filtered by address is the practical resolver — search rows
already embed `address_hash`, so autocomplete isn't strictly needed.

## Caveats

1. **Autocomplete returns 0 for our address queries.** Even for addresses
   the assessor index certainly has. Possibly dev-account scoping or
   normalization quirks. Not blocking (see above), but worth one question
   to Tyler.
2. **Dev account:** 227359 is Realeflow Support with broad entitlements —
   fine for integration work, must swap to a real customer account before
   production (`.env` note says the same).
3. **Credentials hygiene:** `.env` is tracked in the repo but the
   REALEFLOW block is not committed. Keep excluding it from staging.
4. `mailing_opt_out` must be respected when we export mail campaigns.

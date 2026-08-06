# RealeFlow Partner API — offline docs archive

Archived 2026-08-07 from https://documentation.realeflow.com/ (password
protected; credentials shared by Tyler Snyder via Bitwarden — the share link
was temporary, hence this archive). Each `.txt` file is the full text of one
docs page; `manifest.json` lists them.

## The headline answer: NO owner phone numbers

The recent email to Tyler asked whether their data includes contact/phone
numbers for lead enrichment. The docs answer it themselves:

- The Property object has **owner names** (`owner_std_name1_full`,
  standardized parts), **mailing address** (full standardized set, with
  `absentee_owner` flag), occupancy, ownership duration — but **no owner
  phone or email fields anywhere**.
- The only phone fields are **listing/selling agents'** (`status_info.
  list_agent_phone`, `sell_agent_phone`, `rental_info.list_agent_phone`).
- `mailing_opt_out` exists — owners who registered to be excluded from
  direct-mail marketing. We must respect it in exports.

**Consequence:** skip tracing (owner → phone) needs a separate vendor.
RealeFlow gives us the *identity* (name + mailing address) that a skip-trace
vendor needs as input, so the enrichment chain is:
scraped lead → RealeFlow Details (owner name, mailing addr, mortgage,
equity) → skip-trace vendor (phone) → DNC scrub → SMS.

## What the API does give us (very strong for enrichment)

From the Property object (`property-data-api-reference-property-object.txt`):

- **Valuation/equity:** `property_value`, `loan_to_value`,
  `estimated_equity`, `estimated_mortgage_balance`, `total_open_lien_amt`,
  `free_and_clear`, `high_equity` / `low_equity` flags
- **Mortgages:** up to 4, three views — concurrent (`con_curr_mtg{1,2}_*`),
  open (`o_mtg{1..4}_*`) with loan amount, term, due date, type, adj/fix
- **Distress signals:** Leadpipes flags (AbsenteeOwner, BoredInvestor —
  investor held 10+ yrs, LongTermOwner 25+ yrs, etc.), AI Retail Score
  (`index_90d`)
- **Owner:** names, entity type (INDV/BUSI), owner-occupied, mailing address

## Endpoints (all POST/GET JSON, versioned /api/2.0/)

| Endpoint | Path | Use |
| --- | --- | --- |
| Search | `/api/2.0/leadpipes/search` | multi-filter property search |
| Comps | `/api/2.0/leadpipes/comps` | comparables by subject property |
| Details | `/api/2.0/leadpipes/details/{identifier}` | single record — our enrichment workhorse |
| Autocomplete | `/api/2.0/leadpipes/autocomplete` | address/city/ZIP/county suggestions |

## Auth (per request, no anonymous mode)

- `X-RF-Partner-Api-Key: <GUID>` — issued to the partner (not yet issued to
  RealElite; Tyler said he'd enable after docs review)
- `X-RF-Partner-Account-Id: <string|int>` — ExternalAccountId or internal id
- **Base URL is the partner's white-label domain** — there is no shared API
  host. We also need to ask which domain RealElite's key will be scoped to.
- No key rotation endpoint; rotation goes through the account manager.

## What we still need from Tyler / boss

1. API key + Account ID for RealElite (access not yet enabled)
2. The white-label base domain our requests go to
3. Rate limits confirmation (see scope-and-restrictions page)
4. Confirmation that skip-trace/phone data is NOT available through any
   other RealeFlow surface (docs cover Property Data API only — Tyler's
   answer to the email may still reveal an internal skip-trace product)

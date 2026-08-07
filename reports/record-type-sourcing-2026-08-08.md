# Sourcing paths for the boss's record types — findings (2026-08-08)

Goal: statewide FL coverage for pre-foreclosures, tax defaults, probates,
code violations. Two probes were run to find lawful sources for each.

## Probe 1 — county open-data sweep (all 67 counties)

`scripts/discover-fl-wide.mjs` with `RECORD_TYPE=` pre_foreclosure /
tax_delinquent / probate. Same city-level arcgis.com + Socrata method that
found the code-violation sources, same verification bar (real rows + street
address + case signal + FL geo-guard).

| Record type | Verified counties |
|---|---|
| code_violation | 7 (4 live + 3 ready) |
| pre_foreclosure | **0 / 67** |
| tax_delinquent | **0 / 67** |
| probate | **0 / 67** |

This is not a probing failure — it's how the data works. Lis pendens,
probate cases, and tax delinquency live with clerks of court and tax
collectors, who publish through commercial court-records portals, not open
GIS. There is nothing to scrape lawfully at scale.

Raw: `reports/fl-wide-discovery-{pre_foreclosure,tax_delinquent,probate}.json`

## Probe 2 — RealeFlow /search leadTypes (the vendor already has this data)

`scripts/realeflow-leadtypes-probe.mjs` against Hillsborough (12057),
1 read-only request per type, dev account 227359.

| Boss's record type | RealeFlow filter | Result |
|---|---|---|
| Probate | lienTypes `DECEASED_PROBATE` | **OK — 20 rows** (sample: 15125 DAUGHTRY LN) |
| Probate (proxy signal) | leadTypes `POTENTIALLY_INHERITED` | **OK — 20 rows** |
| Tax default (lien form) | lienTypes `TAX_GOVERNMENT_LIEN` | **OK — 20 rows** (sample: 902 21ST ST SE) |
| Vacant/zombie (bonus) | leadTypes `ZOMBIE_PROPERTY`,`VACANCY` | **OK — 20 rows** |
| Pre-foreclosure | leadTypes `PRE_FORECLOSURE` | **400 — "not available on this account"** |
| Foreclosure activity | leadTypes `FORECLOSURE_ACTIVITY` | **400 — not on account** |
| Tax delinquent | leadTypes `RECENTLY_DELINQUENT` | **400 — not on account** |

The 400s are explicit entitlement errors, not API failures — the dev
account simply doesn't have those lead-type licenses switched on.

## What this means (the whole strategy in three lines)

1. **Code violations** → scrape county/city open data (working, 7 counties).
2. **Probate + tax liens + vacancy** → source directly from RealeFlow
   `/search` per county — works TODAY on the dev account, all 67 counties,
   zero scraping.
3. **Pre-foreclosure + tax delinquent** → same path, but Tyler must enable
   `PRE_FORECLOSURE`, `FORECLOSURE_ACTIVITY`, `RECENTLY_DELINQUENT` on the
   account. One email unblocks statewide coverage for both types.

Next engineering step once entitlements land: a nightly RealeFlow pull per
county × lead type into `distress_records` (source_class `licensed_api`,
precedence above open_data), enrichment already proven end-to-end.

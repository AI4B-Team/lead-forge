# Dedup audit — first distress-feed ingest (521 rows, 2026-08-06)

Question: will tomorrow's 05:20 ET run duplicate tonight's 521 code-violation
rows?

## Answer: no. Duplication is impossible at the DB level.

- `distress_records` carries `CONSTRAINT distress_records_dedupe UNIQUE
  (fips, record_type, doc_number)` (migration 20260804075634).
- The feed writes with `.upsert(..., { onConflict:
  "fips,record_type,doc_number" })` — a re-pulled row overwrites itself.
- `doc_number` is deterministic per source row (see below), and both
  adapters order by date DESC with limit 200, so tomorrow re-fetches
  substantially the same rows → same keys → upsert, not insert.

## Reporting nuance (not a bug, but worth knowing)

`added` in the tick report is the upsert count (`count: "exact"`), which
counts UPDATED rows too. Tomorrow's run will likely report `added=200` for
Miami-Dade again even though ~0 new records exist. Don't read `added` as
"new" — if we want a true new-vs-refreshed split, that's a reporting change
for later.

## doc_number quality per county (flags for later, none block tonight)

| County | doc_number basis | Risk |
| --- | --- | --- |
| Miami-Dade | `GIS-{OBJECTID}` | OBJECTIDs can be reassigned if the county republishes the layer → slow duplicate drift over months. Watch. |
| Lee | `GIS-{OBJECTID}` | Same as Miami-Dade. |
| Orange | `SOC-{parcel_id}` | Parcel id, not case id — multiple violations on one parcel collapse into one record (over-dedup, loses cases; never duplicates). |
| Alachua | fallback `ADDRESS\|case_date`, and its field map has NO case_date | Key degrades to address-only — repeat complaints at the same address collapse (over-dedup). |

Over-dedup means we under-count violations for Orange/Alachua; it can never
flood the feed. Acceptable for now; fixing it means finding real case-number
columns in those two datasets and updating their `field_map` rows.

## Watch items for tomorrow's run

1. Tax deed: 23 counties attempt outside the auction blackout — first real
   RealTaxDeed ingest. Compare against Hillsborough's 403.
2. If Hillsborough is still the only 403 → adapter-specific fix. If all 24
   403 → RealAuction blocks the server's IP range; different conversation.

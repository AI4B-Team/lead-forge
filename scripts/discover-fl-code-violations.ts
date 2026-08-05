#!/usr/bin/env bun
// ---------------------------------------------------------------------------
// Florida code-violation open-data coverage discovery.
//
//   bun run scripts/discover-fl-code-violations.ts            # probe + report
//   bun run scripts/discover-fl-code-violations.ts --write    # also persist
//
// Unlike the auction sites (one vendor, one markup), code enforcement data
// lives on each city/county's own open-data portal. The good news: many FL
// metros publish it on Socrata, which is a JSON API — no HTML parsing, no
// CAPTCHA, no layout drift. This script probes a curated list of known FL
// Socrata portals, searches each for code-enforcement datasets, infers a
// field map from the columns, and verifies by pulling REAL sample rows.
//
// Verification rule (same spirit as the auction scripts, enforced in
// `decide`): status='verified' ONLY when the dataset responded AND at least
// one fetched row normalized into a usable lead (street address present).
// A dataset that exists but yields zero usable rows is 'unverified'.
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "node:fs";
import { inferFieldMap, isUsableMap, normalizeRows, type FieldMap } from "../src/lib/data-providers/source-mapping";
import { BOT_USER_AGENT } from "../src/lib/data-providers/scraper-policy";
import { FL_COUNTY_FIPS } from "../src/lib/fl-counties";

const RECORD_TYPE = "code_violation";
const OUT_DIR = "reports";
const WRITE = process.argv.includes("--write");

// ---------------------------------------------------------------------------
// Curated FL open-data portals. Socrata domains do not encode their state
// (data.cityoforlando.net says nothing about FL), so discovery must start from
// a maintained seed list: portal domain -> the county its city sits in.
// Verification below decides what actually works; being listed here proves
// nothing by itself.
//
// Probed and pruned 2026-08-05: most FL metros (Tampa, Jacksonville, Broward,
// Palm Beach, Miami-Dade county, St. Pete, Tallahassee, Cape Coral) do NOT run
// Socrata — they publish on ArcGIS Hub, which is a separate discovery script
// (the arcgis adapter already exists). Miami's Socrata is real but only hosts
// service requests and surveys, no code enforcement dataset; kept so a later
// run notices if they publish one.
// ---------------------------------------------------------------------------

const FL_SOCRATA_PORTALS: Array<{ domain: string; city: string; county: string }> = [
  { domain: "data.cityoforlando.net", city: "Orlando", county: "Orange" }, // verified
  { domain: "data.cityofgainesville.org", city: "Gainesville", county: "Alachua" }, // verified
  { domain: "data.miamigov.com", city: "Miami", county: "Miami-Dade" }, // no CE dataset yet
];

const KEYWORDS = ["code enforcement", "code violation", "code case"];

// ---------------------------------------------------------------------------
// Fetch. Socrata endpoints are plain JSON APIs designed for programmatic use;
// we still identify honestly and keep a per-host gap.
// ---------------------------------------------------------------------------

const lastHit = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + 1_500 - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
  try {
    const res = await fetch(url, { headers: { "User-Agent": BOT_USER_AGENT, Accept: "application/json" } });
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: (await res.json()) as T };
  } catch {
    return { status: 0, body: null };
  }
}

// ---------------------------------------------------------------------------
// Probe one portal: search its catalog, then verify the best dataset by
// pulling real rows through the exact same normalize path production uses.
// ---------------------------------------------------------------------------

type CatalogResult = {
  resource?: { id?: string; name?: string; columns_field_name?: string[]; rows_updated_at?: string };
};

type Probe = {
  domain: string;
  city: string;
  county: string;
  fips: string | null;
  datasetId: string | null;
  datasetTitle: string | null;
  resourceUrl: string | null;
  catalogStatus: number | null;
  candidates: number;
  fieldMap: FieldMap;
  rowsFetched: number;
  usableRows: number;
  lastUpdated: string | null;
  status: "verified" | "unverified";
  reason: string | null;
  sample: Array<{ address: string; city: string | null; case_id: string | null; case_date: string | null; violation: string | null }>;
};

function decide(p: Omit<Probe, "status" | "reason">): { status: Probe["status"]; reason: string | null } {
  if (p.catalogStatus !== 200) return { status: "unverified", reason: `catalog HTTP ${p.catalogStatus}` };
  if (p.candidates === 0) return { status: "unverified", reason: "no code-enforcement dataset in catalog" };
  if (!p.datasetId) return { status: "unverified", reason: "candidates found but none had a usable field map" };
  if (p.rowsFetched === 0) return { status: "unverified", reason: "dataset responded with zero rows" };
  if (p.usableRows === 0) return { status: "unverified", reason: "rows fetched but none normalized to a usable address" };
  return { status: "verified", reason: null };
}

async function probe(portal: { domain: string; city: string; county: string }): Promise<Probe> {
  const base: Omit<Probe, "status" | "reason"> = {
    domain: portal.domain,
    city: portal.city,
    county: portal.county,
    fips: FL_COUNTY_FIPS[portal.county] ?? null,
    datasetId: null,
    datasetTitle: null,
    resourceUrl: null,
    catalogStatus: null,
    candidates: 0,
    fieldMap: {},
    rowsFetched: 0,
    usableRows: 0,
    lastUpdated: null,
    sample: [],
  };

  // 1. Search this portal's catalog (scoped by domain so results are local).
  const seen = new Map<string, CatalogResult>();
  for (const kw of KEYWORDS) {
    const params = new URLSearchParams({ domains: portal.domain, q: kw, only: "dataset", limit: "20" });
    const { status, body } = await getJson<{ results?: CatalogResult[] }>(
      `https://api.us.socrata.com/api/catalog/v1?${params}`,
    );
    base.catalogStatus = status;
    if (status !== 200 || !body) continue;
    for (const r of body.results ?? []) {
      const id = r.resource?.id;
      if (id && !seen.has(id)) seen.set(id, r);
    }
  }
  base.candidates = seen.size;
  if (seen.size === 0) return { ...base, ...decide(base) };

  // 2. Rank candidates: name must actually smell like code enforcement, and
  //    the inferred field map must be usable. Prefer recently updated data.
  const ranked = [...seen.values()]
    .filter((r) => /code|violation|enforcement/i.test(r.resource?.name ?? ""))
    .map((r) => ({ r, map: inferFieldMap(r.resource?.columns_field_name ?? []) }))
    .filter(({ map }) => isUsableMap(map))
    .sort((a, b) => (b.r.resource?.rows_updated_at ?? "").localeCompare(a.r.resource?.rows_updated_at ?? ""));
  if (ranked.length === 0) return { ...base, ...decide(base) };

  // 3. Verify with real rows, trying the best 3 candidates.
  for (const { r, map } of ranked.slice(0, 3)) {
    const id = r.resource!.id!;
    const url = `https://${portal.domain}/resource/${id}.json?$limit=25`;
    const { body } = await getJson<Array<Record<string, unknown>>>(url);
    if (!body || body.length === 0) continue;
    const leads = normalizeRows(body, map, {
      recordType: RECORD_TYPE,
      county: `${portal.county}, FL`,
      state: "FL",
      provider: `${portal.domain} Open Data (Socrata)`,
      casePrefix: "SOC",
      defaultCity: portal.city,
    });
    base.datasetId = id;
    base.datasetTitle = r.resource?.name ?? id;
    base.resourceUrl = `https://${portal.domain}/resource/${id}.json`;
    base.fieldMap = map;
    base.rowsFetched = body.length;
    base.usableRows = leads.length;
    base.lastUpdated = r.resource?.rows_updated_at ?? null;
    const s = (v: unknown): string | null => (v == null ? null : String(v));
    base.sample = leads.slice(0, 3).map((l) => ({
      address: l.address ?? "",
      city: l.city ?? null,
      case_id: s(l.source_meta?.["case_id"]),
      case_date: s(l.source_meta?.["case_date"]),
      violation: s(l.source_meta?.["violation"])?.slice(0, 120) ?? null,
    }));
    if (leads.length > 0) break;
  }
  return { ...base, ...decide(base) };
}

// ---------------------------------------------------------------------------
// Persist (only with --write) — same shape the auction discovery writes, so
// the same coverage gates and admin views apply.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

async function sb(path: string, init: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : await res.json();
}

async function persist(probes: Probe[]) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required for --write");
  for (const p of probes) {
    if (!p.datasetId) continue; // nothing catalogable for this portal
    const sourceRows = (await sb(`data_sources?on_conflict=platform,domain,dataset_id,record_type`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([
        {
          platform: "socrata",
          source_class: "open_data",
          domain: p.domain,
          dataset_id: p.datasetId,
          record_type: RECORD_TYPE,
          resource_url: p.resourceUrl,
          title: p.datasetTitle,
          entity_name: p.city,
          jurisdiction: `${p.county} County, FL`,
          county_name: p.county,
          state: "FL",
          fips: p.fips,
          field_map: p.fieldMap,
          precedence: 10,
          crawl_interval_minutes: 1440,
          status: p.status === "verified" ? "verified" : "discovered",
          row_estimate: p.usableRows || null,
          last_error: p.reason,
          last_verified_at: p.status === "verified" ? new Date().toISOString() : null,
          last_success_at: p.usableRows > 0 ? new Date().toISOString() : null,
        },
      ]),
    })) as Array<{ id: string }>;
    const sourceId = sourceRows?.[0]?.id ?? null;

    const coverage = {
      source_id: sourceId,
      fips: p.fips,
      state: "FL",
      county_name: p.county,
      record_type: RECORD_TYPE,
      status: p.status,
      sample_row_count: p.usableRows,
      verified_at: p.status === "verified" ? new Date().toISOString() : null,
      last_success_at: p.usableRows > 0 ? new Date().toISOString() : null,
    };
    const existing = (await sb(
      `source_coverage?select=id&fips=eq.${p.fips}&record_type=eq.${RECORD_TYPE}` +
        (sourceId ? `&source_id=eq.${sourceId}` : `&source_id=is.null`),
      { method: "GET" },
    )) as Array<{ id: string }>;
    if (existing?.[0]?.id) {
      await sb(`source_coverage?id=eq.${existing[0].id}`, { method: "PATCH", body: JSON.stringify(coverage) });
    } else {
      await sb(`source_coverage`, { method: "POST", body: JSON.stringify([coverage]) });
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Probing ${FL_SOCRATA_PORTALS.length} known FL open-data portals for ${RECORD_TYPE}\n`);
  const probes: Probe[] = [];
  for (const portal of FL_SOCRATA_PORTALS) {
    const p = await probe(portal);
    probes.push(p);
    console.log(
      `${p.status === "verified" ? "OK  " : "MISS"} ${p.county.padEnd(12)} ${p.domain.padEnd(30)} ` +
        `candidates=${p.candidates} rows=${p.rowsFetched} usable=${p.usableRows}` +
        `${p.datasetTitle ? ` — "${p.datasetTitle}"` : ""}${p.reason ? ` — ${p.reason}` : ""}`,
    );
  }

  // A county is covered if ANY of its portals verified (Tampa city covers
  // Hillsborough even if the county's own portal has nothing).
  const verifiedCounties = new Set(probes.filter((p) => p.status === "verified").map((p) => p.county));
  const failures = probes.filter((p) => p.status !== "verified");

  console.log(`\n=== FL code-violation open-data coverage ===`);
  console.log(`Portals probed:        ${probes.length}`);
  console.log(`Datasets verified:     ${probes.filter((p) => p.status === "verified").length}`);
  console.log(`Counties covered:      ${verifiedCounties.size} (${[...verifiedCounties].sort().join(", ") || "none"})`);
  console.log(`Unverified portals:    ${failures.length}`);
  for (const f of failures) console.log(`  - ${f.domain}: ${f.reason}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const path = `${OUT_DIR}/fl-code-violation-coverage.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recordType: RECORD_TYPE,
        totals: {
          portalsProbed: probes.length,
          datasetsVerified: probes.filter((p) => p.status === "verified").length,
          countiesCovered: verifiedCounties.size,
        },
        probes,
      },
      null,
      2,
    ),
  );
  console.log(`\nReport → ${path}`);

  if (WRITE) {
    await persist(probes);
    console.log(`Wrote coverage rows for ${probes.filter((p) => p.datasetId).length} datasets.`);
  } else {
    console.log(`Dry run — pass --write to update source_coverage.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

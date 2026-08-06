#!/usr/bin/env bun
// ---------------------------------------------------------------------------
// Florida code-violation coverage discovery — ArcGIS Hub / Feature Services.
//
//   bun run scripts/discover-fl-code-violations-arcgis.ts            # probe
//   bun run scripts/discover-fl-code-violations-arcgis.ts --write    # persist
//
// The Socrata sweep (discover-fl-code-violations.ts) found that most FL
// metros publish on ArcGIS, not Socrata. This script searches the public
// arcgis.com catalog per county, enumerates each candidate Feature Service's
// layers, infers a field map from the layer schema, and verifies by pulling
// REAL rows through the production normalizeRows path.
//
// ArcGIS results are full of polygon layers (enforcement ZONES, district
// boundaries) that contain no case data. Those die naturally in verification:
// a zones layer has no street-address column, so its field map is unusable,
// or its rows normalize to nothing. Verified means verified.
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "node:fs";
import { inferFieldMap, isUsableMap, normalizeRows, type FieldMap } from "../src/lib/data-providers/source-mapping";
import { BOT_USER_AGENT } from "../src/lib/data-providers/scraper-policy";
import { FL_COUNTY_FIPS } from "../src/lib/fl-counties";

const RECORD_TYPE = "code_violation";
const OUT_DIR = "reports";
const WRITE = process.argv.includes("--write");
const LIMIT = Number(process.env["LIMIT"] ?? 0); // cap counties for smoke tests

const SEARCH_URL = "https://www.arcgis.com/sharing/rest/search";

// Counties already covered by the Socrata sweep are skipped so the two
// scripts never fight over the same coverage row.
const SOCRATA_COVERED = new Set(["Orange", "Alachua"]);

// ---------------------------------------------------------------------------
// Fetch — public Esri JSON APIs, still honestly identified and throttled.
// ---------------------------------------------------------------------------

const lastHit = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + 1_200 - Date.now();
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
// Catalog search, per county.
// ---------------------------------------------------------------------------

type SearchItem = { id?: string; title?: string; url?: string; owner?: string; type?: string };

// The catalog search matches on descriptions too, so it returns things like
// statewide "HABHRCA Data" that merely mention a county. An address column is
// not enough — the ITEM or LAYER must actually be named like code
// enforcement, or a smoke test verifies algae-bloom addresses as violations.
const TITLE_RX = /code\s*(enforcement|violation|case|complaint)|violation|enforcement\s*case/i;

async function searchCounty(county: string): Promise<SearchItem[]> {
  const out: SearchItem[] = [];
  const seen = new Set<string>();
  for (const q of [
    `code enforcement "${county}" florida type:"Feature Service"`,
    `code violations "${county}" florida type:"Feature Service"`,
  ]) {
    const params = new URLSearchParams({ q, num: "10", f: "json" });
    const { body } = await getJson<{ results?: SearchItem[] }>(`${SEARCH_URL}?${params}`);
    for (const r of body?.results ?? []) {
      if (!r.url || !r.id || seen.has(r.id)) continue;
      // Case DATA lives on FeatureServers; MapServer-only items are maps.
      if (!/FeatureServer/i.test(r.url)) continue;
      if (!TITLE_RX.test(r.title ?? "")) continue;
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Probe one county: walk candidate services -> layers -> verify with rows.
// ---------------------------------------------------------------------------

type Probe = {
  county: string;
  fips: string | null;
  candidates: number;
  layersProbed: number;
  serviceTitle: string | null;
  layerUrl: string | null;
  layerName: string | null;
  fieldMap: FieldMap;
  rowsFetched: number;
  usableRows: number;
  status: "verified" | "unverified";
  reason: string | null;
  /** Set only by a manual attribution override; scopes the pull to this county. */
  attributionWhere?: string;
  /** Layer this county was stripped of by a manual attribution override. */
  rejectedLayerUrl?: string;
  sample: Array<{ address: string; city: string | null; case_id: string | null; violation: string | null }>;
};

function decide(p: Omit<Probe, "status" | "reason">): { status: Probe["status"]; reason: string | null } {
  if (p.candidates === 0) return { status: "unverified", reason: "no Feature Service in the arcgis.com catalog" };
  if (p.layersProbed === 0) return { status: "unverified", reason: "services found but no layers responded" };
  if (!p.layerUrl) return { status: "unverified", reason: "no layer had an address-bearing schema (zones/boundaries only)" };
  if (p.usableRows === 0) return { status: "unverified", reason: "layer rows fetched but none normalized to a usable address" };
  return { status: "verified", reason: null };
}

type LayerListing = { layers?: Array<{ id?: number; name?: string; type?: string }> };
type LayerMeta = { name?: string; type?: string; fields?: Array<{ name?: string }> };
type QueryResult = { features?: Array<{ attributes?: Record<string, unknown> }>; error?: unknown };

async function probeCounty(county: string): Promise<Probe> {
  const base: Omit<Probe, "status" | "reason"> = {
    county,
    fips: FL_COUNTY_FIPS[county] ?? null,
    candidates: 0,
    layersProbed: 0,
    serviceTitle: null,
    layerUrl: null,
    layerName: null,
    fieldMap: {},
    rowsFetched: 0,
    usableRows: 0,
    sample: [],
  };

  const items = await searchCounty(county);
  base.candidates = items.length;
  if (items.length === 0) return { ...base, ...decide(base) };

  for (const item of items.slice(0, 4)) {
    const serviceUrl = item.url!.replace(/\/\d+$/, "").replace(/\/$/, "");
    // Item URLs sometimes point at a specific layer already (…/FeatureServer/3).
    const directLayer = /FeatureServer\/\d+$/i.test(item.url!) ? item.url! : null;
    const layerUrls: string[] = [];
    if (directLayer) {
      layerUrls.push(directLayer);
    } else {
      const { body } = await getJson<LayerListing>(`${serviceUrl}?f=json`);
      for (const l of (body?.layers ?? []).slice(0, 5)) {
        if (l.id != null) layerUrls.push(`${serviceUrl}/${l.id}`);
      }
    }

    for (const layerUrl of layerUrls) {
      const { body: meta } = await getJson<LayerMeta>(`${layerUrl}?f=json`);
      if (!meta?.fields?.length) continue;
      // Zones/boundary layers share the service with the case layer; require
      // the layer itself to look like case data unless the service is
      // unambiguous.
      if (!TITLE_RX.test(meta.name ?? "") && !TITLE_RX.test(item.title ?? "")) continue;
      base.layersProbed += 1;
      const columns = meta.fields.map((f) => f.name ?? "").filter(Boolean);
      const map = inferFieldMap(columns);
      if (!isUsableMap(map)) continue;

      const params = new URLSearchParams({
        where: "1=1",
        outFields: "*",
        returnGeometry: "false",
        f: "json",
        resultRecordCount: "25",
      });
      const { body: q } = await getJson<QueryResult>(`${layerUrl}/query?${params}`);
      if (!q || q.error || !q.features?.length) continue;
      const rows = q.features.map((f) => f.attributes ?? {});
      const leads = normalizeRows(rows, map, {
        recordType: RECORD_TYPE,
        county: `${county}, FL`,
        state: "FL",
        provider: `${new URL(layerUrl).host} (ArcGIS Feature Service)`,
        casePrefix: "GIS",
      });
      if (leads.length === 0) continue;

      const s = (v: unknown): string | null => (v == null ? null : String(v));
      base.serviceTitle = item.title ?? null;
      base.layerUrl = layerUrl;
      base.layerName = meta.name ?? null;
      base.fieldMap = map;
      base.rowsFetched = rows.length;
      base.usableRows = leads.length;
      base.sample = leads.slice(0, 3).map((l) => ({
        address: l.address ?? "",
        city: l.city ?? null,
        case_id: s(l.source_meta?.["case_id"]),
        violation: s(l.source_meta?.["violation"])?.slice(0, 120) ?? null,
      }));
      return { ...base, ...decide(base) };
    }
  }
  return { ...base, ...decide(base) };
}

// ---------------------------------------------------------------------------
// Persist (only with --write) — same rows the other discoveries write.
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
    // A county stripped by an attribution override may still carry a coverage
    // row from an earlier run. Retract it, or the app keeps claiming coverage
    // it does not have.
    if (p.rejectedLayerUrl) {
      const owners = (await sb(
        `data_sources?select=id&resource_url=eq.${encodeURIComponent(p.rejectedLayerUrl)}`,
        { method: "GET" },
      )) as Array<{ id: string }>;
      for (const owner of owners ?? []) {
        await sb(
          `source_coverage?fips=eq.${p.fips}&record_type=eq.${RECORD_TYPE}&source_id=eq.${owner.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status: "unverified",
              sample_row_count: 0,
              verified_at: null,
              last_success_at: null,
            }),
          },
        );
      }
      continue;
    }
    if (!p.layerUrl) continue;
    const domain = new URL(p.layerUrl).host;
    const sourceRows = (await sb(`data_sources?on_conflict=platform,domain,dataset_id,record_type`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([
        {
          platform: "arcgis",
          source_class: "open_data",
          domain,
          dataset_id: p.layerUrl.split("/rest/services/")[1] ?? p.layerUrl,
          record_type: RECORD_TYPE,
          resource_url: p.layerUrl,
          title: p.serviceTitle ?? p.layerName,
          jurisdiction: `${p.county} County, FL`,
          county_name: p.county,
          state: "FL",
          fips: p.fips,
          field_map: p.attributionWhere
            ? { ...p.fieldMap, _where: p.attributionWhere }
            : p.fieldMap,
          precedence: 20, // Socrata wins when both exist (see PLATFORM_ORDER)
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
// Run — every FL county not already covered by the Socrata sweep.
// ---------------------------------------------------------------------------

async function main() {
  const counties = Object.keys(FL_COUNTY_FIPS)
    .filter((c) => !SOCRATA_COVERED.has(c))
    .sort();
  const list = LIMIT > 0 ? counties.slice(0, LIMIT) : counties;
  console.log(`Searching arcgis.com for ${RECORD_TYPE} layers across ${list.length} FL counties\n`);

  const probes: Probe[] = [];
  for (const county of list) {
    const p = await probeCounty(county);
    probes.push(p);
    console.log(
      `${p.status === "verified" ? "OK  " : "MISS"} ${p.county.padEnd(14)} ` +
        `candidates=${p.candidates} layers=${p.layersProbed} rows=${p.rowsFetched} usable=${p.usableRows}` +
        `${p.serviceTitle ? ` — "${p.serviceTitle}"` : ""}${p.reason ? ` — ${p.reason}` : ""}`,
    );
  }

  // Manual county attribution. A shared regional layer legitimately belongs to
  // ONE jurisdiction; the ambiguity is in the catalog search, not the data.
  // Each entry is a human decision recorded in code: the owning county, plus
  // the WHERE clause that keeps the pull inside that county's rows.
  const ATTRIBUTION_OVERRIDES: Array<{ layerMatch: RegExp; county: string; where: string; note: string }> = [
    {
      layerMatch: /MunicipalCodeAppPts/i,
      county: "Broward",
      // Broward County GIS publishes this layer; Palm Beach only matched it
      // because the catalog search hits the description text.
      where: "1=1",
      note: "Broward County GIS publishes MunicipalCodeAppPts; attributed manually",
    },
  ];

  // Integrity guard: a shared regional layer can match several county
  // searches (Broward's "MunicipalCodeAppPts" also comes back for Palm
  // Beach). Ingesting it under both counties would mislabel every row. With an
  // attribution override we keep the owning county verified and drop the
  // others; without one, ALL of them are demoted for a human to assign.
  const byLayer = new Map<string, Probe[]>();
  for (const p of probes) {
    if (p.status === "verified" && p.layerUrl) {
      byLayer.set(p.layerUrl, [...(byLayer.get(p.layerUrl) ?? []), p]);
    }
  }
  for (const [url, group] of byLayer) {
    if (group.length <= 1) continue;
    const override = ATTRIBUTION_OVERRIDES.find((o) => o.layerMatch.test(url));
    if (override && group.some((p) => p.county === override.county)) {
      for (const p of group) {
        if (p.county === override.county) {
          p.attributionWhere = override.where;
          p.reason = `shared regional layer attributed to ${override.county} — ${override.note}`;
          continue;
        }
        // Not this county's data: drop the layer so nothing is persisted under it.
        p.status = "unverified";
        p.layerUrl = null;
        p.rejectedLayerUrl = url;
        p.reason = `layer belongs to ${override.county} County (manual attribution) — not ${p.county}: ${url}`;
      }
      continue;
    }
    for (const p of group) {
      p.status = "unverified";
      p.reason = `layer matched ${group.length} counties (${group.map((g) => g.county).join(", ")}) — shared regional dataset, needs manual county attribution: ${url}`;
    }
  }

  const verified = probes.filter((p) => p.status === "verified");
  console.log(`\n=== FL code-violation ArcGIS coverage ===`);
  console.log(`Counties probed:   ${probes.length}`);
  console.log(`Verified:          ${verified.length} (${verified.map((p) => p.county).join(", ") || "none"})`);
  console.log(`Unverified:        ${probes.length - verified.length}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const path = `${OUT_DIR}/fl-code-violation-arcgis-coverage.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recordType: RECORD_TYPE,
        platform: "arcgis",
        totals: { countiesProbed: probes.length, verified: verified.length },
        probes,
      },
      null,
      2,
    ),
  );
  console.log(`\nReport → ${path}`);

  if (WRITE) {
    await persist(probes);
    console.log(`Wrote coverage rows for ${probes.filter((p) => p.layerUrl).length} layers.`);
  } else {
    console.log(`Dry run — pass --write to update source_coverage.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

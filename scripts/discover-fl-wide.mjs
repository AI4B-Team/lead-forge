#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Florida code-violation WIDE discovery — city-level, multi-platform.
//
//   node scripts/discover-fl-wide.mjs               # full probe (all 67)
//   LIMIT=5 node scripts/discover-fl-wide.mjs       # smoke test
//   COUNTY=Polk node scripts/discover-fl-wide.mjs   # single county
//
// Why this exists: the earlier arcgis.com sweep searched by COUNTY name only
// and found 2/65. Code-enforcement data is published by CITIES, under city
// names, and often on platforms other than arcgis.com (Socrata, Accela
// portals). This script probes, per county:
//
//   1. arcgis.com catalog — searched per major CITY, not just the county
//   2. Socrata Discovery API (api.us.socrata.com) — global, cross-domain
//   3. Accela Citizen Access — detection only (portal exists ⇒ records
//      request / adapter work possible, but NO scraping: ACA is interactive)
//
// Verification rule (same spirit as the bun discovery scripts): a source is
// "verified" ONLY if real rows were fetched AND at least one normalized to a
// usable street address AND the layer carries a case signal (case number /
// status / date — OBJECTID alone is a parcel directory, not case data).
//
// Read-only everywhere. Honest User-Agent, per-host throttle, no CAPTCHA,
// no retries against blocks. Field-map inference is an inline copy of
// src/lib/data-providers/source-mapping.ts candidates (this is a local audit
// tool; production wiring goes through Lovable using the real module).
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "node:fs";

const BOT_USER_AGENT = "LeadTraceBot/1.0 (+https://leadtrace.app/bot)";
const OUT_DIR = "reports";
const LIMIT = Number(process.env.LIMIT ?? 0);
const ONLY_COUNTY = process.env.COUNTY ?? null;

// ---------------------------------------------------------------------------
// FL counties → FIPS + principal cities (county seat first). City names are
// what municipal GIS/open-data items are titled with, so they drive search.
// ---------------------------------------------------------------------------

const FL = [
  ["Alachua", "12001", ["Gainesville"]],
  ["Baker", "12003", ["Macclenny"]],
  ["Bay", "12005", ["Panama City", "Panama City Beach", "Lynn Haven"]],
  ["Bradford", "12007", ["Starke"]],
  ["Brevard", "12009", ["Melbourne", "Palm Bay", "Titusville", "Cocoa"]],
  ["Broward", "12011", ["Fort Lauderdale", "Hollywood", "Pembroke Pines", "Pompano Beach", "Coral Springs"]],
  ["Calhoun", "12013", ["Blountstown"]],
  ["Charlotte", "12015", ["Punta Gorda", "Port Charlotte"]],
  ["Citrus", "12017", ["Inverness", "Crystal River"]],
  ["Clay", "12019", ["Green Cove Springs", "Orange Park", "Middleburg"]],
  ["Collier", "12021", ["Naples", "Marco Island", "Immokalee"]],
  ["Columbia", "12023", ["Lake City"]],
  ["DeSoto", "12027", ["Arcadia"]],
  ["Dixie", "12029", ["Cross City"]],
  ["Duval", "12031", ["Jacksonville"]],
  ["Escambia", "12033", ["Pensacola"]],
  ["Flagler", "12035", ["Palm Coast", "Bunnell"]],
  ["Franklin", "12037", ["Apalachicola"]],
  ["Gadsden", "12039", ["Quincy"]],
  ["Gilchrist", "12041", ["Trenton"]],
  ["Glades", "12043", ["Moore Haven"]],
  ["Gulf", "12045", ["Port St. Joe"]],
  ["Hamilton", "12047", ["Jasper"]],
  ["Hardee", "12049", ["Wauchula"]],
  ["Hendry", "12051", ["LaBelle", "Clewiston"]],
  ["Hernando", "12053", ["Brooksville", "Spring Hill"]],
  ["Highlands", "12055", ["Sebring", "Avon Park"]],
  ["Hillsborough", "12057", ["Tampa", "Plant City", "Temple Terrace"]],
  ["Holmes", "12059", ["Bonifay"]],
  ["Indian River", "12061", ["Vero Beach", "Sebastian"]],
  ["Jackson", "12063", ["Marianna"]],
  ["Jefferson", "12065", ["Monticello"]],
  ["Lafayette", "12067", ["Mayo"]],
  ["Lake", "12069", ["Tavares", "Clermont", "Leesburg", "Eustis"]],
  ["Lee", "12071", ["Fort Myers", "Cape Coral", "Bonita Springs"]],
  ["Leon", "12073", ["Tallahassee"]],
  ["Levy", "12075", ["Bronson", "Williston", "Chiefland"]],
  ["Liberty", "12077", ["Bristol"]],
  ["Madison", "12079", ["Madison"]],
  ["Manatee", "12081", ["Bradenton", "Palmetto"]],
  ["Marion", "12083", ["Ocala"]],
  ["Martin", "12085", ["Stuart"]],
  ["Miami-Dade", "12086", ["Miami", "Hialeah", "Miami Beach", "Miami Gardens", "Homestead"]],
  ["Monroe", "12087", ["Key West", "Marathon"]],
  ["Nassau", "12089", ["Fernandina Beach", "Yulee"]],
  ["Okaloosa", "12091", ["Fort Walton Beach", "Crestview", "Destin"]],
  ["Okeechobee", "12093", ["Okeechobee"]],
  ["Orange", "12095", ["Orlando", "Winter Park", "Apopka", "Ocoee"]],
  ["Osceola", "12097", ["Kissimmee", "St. Cloud"]],
  ["Palm Beach", "12099", ["West Palm Beach", "Boca Raton", "Boynton Beach", "Delray Beach"]],
  ["Pasco", "12101", ["New Port Richey", "Zephyrhills", "Dade City", "Wesley Chapel"]],
  ["Pinellas", "12103", ["St. Petersburg", "Clearwater", "Largo", "Pinellas Park"]],
  ["Polk", "12105", ["Lakeland", "Winter Haven", "Bartow"]],
  ["Putnam", "12107", ["Palatka"]],
  ["St. Johns", "12109", ["St. Augustine"]],
  ["St. Lucie", "12111", ["Port St. Lucie", "Fort Pierce"]],
  ["Santa Rosa", "12113", ["Milton", "Navarre", "Gulf Breeze"]],
  ["Sarasota", "12115", ["Sarasota", "North Port", "Venice"]],
  ["Seminole", "12117", ["Sanford", "Altamonte Springs", "Oviedo", "Casselberry"]],
  ["Sumter", "12119", ["Bushnell", "Wildwood", "The Villages"]],
  ["Suwannee", "12121", ["Live Oak"]],
  ["Taylor", "12123", ["Perry"]],
  ["Union", "12125", ["Lake Butler"]],
  ["Volusia", "12127", ["Daytona Beach", "Deltona", "Port Orange", "DeLand"]],
  ["Wakulla", "12129", ["Crawfordville"]],
  ["Walton", "12131", ["DeFuniak Springs", "Santa Rosa Beach"]],
  ["Washington", "12133", ["Chipley"]],
];

// Counties whose code_violation feed is already live in production — skipped
// so this sweep never fights the existing coverage rows.
const ALREADY_LIVE = new Set(["Miami-Dade", "Alachua", "Orange", "Lee"]);

// ---------------------------------------------------------------------------
// Throttled fetch. One outstanding request per host, minimum gap between
// hits to the same host. No retries: a block is a block.
// ---------------------------------------------------------------------------

const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttled(url, gapMs = 1200) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + gapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

async function getJson(url) {
  await throttled(url);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BOT_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { status: res.status, body: null };
    return { status: res.status, body: await res.json() };
  } catch {
    return { status: 0, body: null };
  }
}

// Detection-only GET (Accela). We look at the final status; body ignored.
async function probeUrl(url) {
  await throttled(url, 1500);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BOT_USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch {
    return { ok: false, status: 0, finalUrl: null };
  }
}

// ---------------------------------------------------------------------------
// Field-map inference (inline copy of production candidates — see header).
// ---------------------------------------------------------------------------

const CANDIDATES = [
  ["address", ["address", "full_address", "street_address", "property_address", "location_address", "site_address", "addr"]],
  ["house_number", ["house_number", "housenumber", "house_no", "streetnumber", "street_number"]],
  ["street_name", ["street_name", "streetname", "street"]],
  ["city", ["city", "municipality", "town"]],
  ["zip", ["zip", "zipcode", "zip_code", "postal_code", "postalcode"]],
  ["case_id", ["case_number", "casenumber", "case_id", "caseid", "violation_number", "violationid", "record_id", "objectid", "id"]],
  ["case_date", ["violation_date", "violationdate", "case_date", "filing_date", "inspection_date", "inspectiondate", "issue_date", "date", "created_date", "recorded_date"]],
  ["status", ["status", "violation_status", "violationstatus", "case_status", "current_status", "disposition"]],
  ["description", ["description", "violation_description", "violationcodetitle", "code_description", "comments", "narrative", "type", "nov_description"]],
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function inferFieldMap(columns) {
  const byNorm = new Map(columns.map((c) => [norm(c), c]));
  const map = {};
  for (const [key, options] of CANDIDATES) {
    for (const opt of options) {
      const hit = byNorm.get(opt);
      if (hit) {
        map[key] = hit;
        break;
      }
    }
    if (!map[key]) {
      const loose = columns.find((c) => options.some((o) => norm(c).includes(o)));
      if (loose) map[key] = loose;
    }
  }
  return map;
}

const isUsableMap = (m) => Boolean(m.address || (m.house_number && m.street_name));
// An address column alone is a parcel directory; real case layers carry a
// case number, a status, or a filing date. OBJECTID is not a case number.
const hasCaseSignal = (m) =>
  Boolean((m.case_id && !/^objectid$/i.test(m.case_id)) || m.status || m.case_date);

const str = (v) => (v == null ? "" : String(v).trim());

function usableRows(rows, map) {
  let usable = 0;
  const sample = [];
  for (const r of rows) {
    const address = map.address
      ? str(r[map.address])
      : `${str(map.house_number ? r[map.house_number] : "")} ${str(map.street_name ? r[map.street_name] : "")}`.trim();
    if (address.length < 5) continue;
    usable += 1;
    if (sample.length < 3) {
      sample.push({
        address,
        case_id: map.case_id ? str(r[map.case_id]) || null : null,
        status: map.status ? str(r[map.status]) || null : null,
        description: map.description ? str(r[map.description]).slice(0, 120) || null : null,
      });
    }
  }
  return { usable, sample };
}

// ---------------------------------------------------------------------------
// Record-type configs. Items must actually be NAMED like the record type, or
// catalog description matches verify algae-bloom layers as violations
// (lesson from the first sweep). Select with RECORD_TYPE env var.
//
// countyLevel:true → these records live with the clerk of court / tax
// collector, not with cities, so we only search "<X> County" + county seat
// (halves the query volume and avoids city-parcel noise).
// ---------------------------------------------------------------------------

const RECORD_TYPES = {
  code_violation: {
    searchTerm: "code enforcement",
    titleRx: /code\s*(enforcement|violation|case|complaint)|violation|enforcement\s*case/i,
    countyLevel: false,
  },
  pre_foreclosure: {
    searchTerm: "lis pendens foreclosure",
    titleRx: /lis\s*pendens|foreclosure|pre.?foreclosure/i,
    countyLevel: true,
  },
  tax_delinquent: {
    searchTerm: "delinquent tax",
    titleRx: /delinquent|tax\s*(deed|certificate|default|sale)/i,
    countyLevel: true,
  },
  probate: {
    searchTerm: "probate case",
    titleRx: /probate|estate\s*case/i,
    countyLevel: true,
  },
};

const RECORD_TYPE = process.env.RECORD_TYPE ?? "code_violation";
const CFG = RECORD_TYPES[RECORD_TYPE];
if (!CFG) {
  console.error(`Unknown RECORD_TYPE "${RECORD_TYPE}". Options: ${Object.keys(RECORD_TYPES).join(", ")}`);
  process.exit(1);
}
const TITLE_RX = CFG.titleRx;

// ---------------------------------------------------------------------------
// Florida geo-guard. County names repeat across states (Jefferson KY, Union
// NC, Washington UT all verified in the first pass of this sweep — real case
// data, wrong state). A layer's extent is authoritative: if its center is
// outside Florida's bbox, it is not our county no matter what it is named.
// ---------------------------------------------------------------------------

const FL_BBOX = { xmin: -87.7, ymin: 24.3, xmax: -79.8, ymax: 31.1 };

function extentInFlorida(extent) {
  if (!extent || extent.xmin == null) return null; // unknown — judge by address text instead
  const sr = extent.spatialReference?.latestWkid ?? extent.spatialReference?.wkid;
  let { xmin, ymin, xmax, ymax } = extent;
  if (sr === 3857 || sr === 102100) {
    const toLon = (x) => (x / 20037508.34) * 180;
    const toLat = (y) => (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
    [xmin, xmax] = [toLon(xmin), toLon(xmax)];
    [ymin, ymax] = [toLat(ymin), toLat(ymax)];
  } else if (sr !== 4326 && sr != null) {
    return null; // local projection — cannot judge from the extent
  }
  const cx = (xmin + xmax) / 2;
  const cy = (ymin + ymax) / 2;
  return cx >= FL_BBOX.xmin && cx <= FL_BBOX.xmax && cy >= FL_BBOX.ymin && cy <= FL_BBOX.ymax;
}

// Fallback for layers whose extent is unreadable: sample addresses that spell
// out a non-FL state ("…, KY 40212", "Hurricane, UT") disqualify the source.
// The comma is mandatory: a bare space would turn street suffixes into states
// ("502 Sunset CT" is a Court in Florida, not Connecticut).
const NON_FL_STATE_RX = /,\s*(A[KLRZ]|C[AOT]|D[CE]|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])(\s+\d{5}(-\d{4})?)?\s*$/m;

function samplesLookNonFlorida(sample) {
  return sample.some((s) => NON_FL_STATE_RX.test(s.address) && !/(,|\s)FL\b/i.test(s.address));
}

// ---------------------------------------------------------------------------
// 1. arcgis.com catalog — per-city searches (the county-only search missed
//    city-published data, which is where code enforcement actually lives).
// ---------------------------------------------------------------------------

async function searchArcgis(names) {
  const out = [];
  const seen = new Set();
  for (const name of names) {
    const q = `${CFG.searchTerm} "${name}" type:"Feature Service"`;
    const params = new URLSearchParams({ q, num: "10", f: "json" });
    const { body } = await getJson(`https://www.arcgis.com/sharing/rest/search?${params}`);
    for (const r of body?.results ?? []) {
      if (!r.url || !r.id || seen.has(r.id)) continue;
      if (!/FeatureServer/i.test(r.url)) continue;
      if (!TITLE_RX.test(r.title ?? "")) continue;
      seen.add(r.id);
      out.push({ id: r.id, title: r.title ?? null, url: r.url, matchedName: name });
    }
  }
  return out;
}

async function verifyArcgisItem(item) {
  const serviceUrl = item.url.replace(/\/\d+$/, "").replace(/\/$/, "");
  const layerUrls = /FeatureServer\/\d+$/i.test(item.url) ? [item.url] : [];
  if (layerUrls.length === 0) {
    const { body } = await getJson(`${serviceUrl}?f=json`);
    for (const l of (body?.layers ?? []).slice(0, 5)) {
      if (l.id != null) layerUrls.push(`${serviceUrl}/${l.id}`);
    }
  }
  for (const layerUrl of layerUrls) {
    const { body: meta } = await getJson(`${layerUrl}?f=json`);
    if (!meta?.fields?.length) continue;
    if (!TITLE_RX.test(meta.name ?? "") && !TITLE_RX.test(item.title ?? "")) continue;
    // Geo-guard: same-named counties in other states die here, not in prod.
    if (extentInFlorida(meta.extent) === false) continue;
    const map = inferFieldMap(meta.fields.map((f) => f.name ?? "").filter(Boolean));
    if (!isUsableMap(map) || !hasCaseSignal(map)) continue;
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      returnGeometry: "false",
      f: "json",
      resultRecordCount: "25",
    });
    const { body: q } = await getJson(`${layerUrl}/query?${params}`);
    if (!q || q.error || !q.features?.length) continue;
    const rows = q.features.map((f) => f.attributes ?? {});
    const { usable, sample } = usableRows(rows, map);
    if (usable === 0) continue;
    if (samplesLookNonFlorida(sample)) continue; // extent was unreadable but the addresses say another state
    return {
      platform: "arcgis",
      title: item.title,
      matchedName: item.matchedName,
      resourceUrl: layerUrl,
      layerName: meta.name ?? null,
      fieldMap: map,
      rowsFetched: rows.length,
      usableRows: usable,
      sample,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Socrata Discovery API — global cross-domain catalog. The old sweep only
//    probed 3 hand-seeded portals; this searches every Socrata domain at once.
// ---------------------------------------------------------------------------

async function searchSocrata(names) {
  const out = [];
  const seen = new Set();
  for (const name of names) {
    const params = new URLSearchParams({
      q: `${CFG.searchTerm} ${name}`,
      only: "datasets",
      limit: "10",
    });
    const { body } = await getJson(`https://api.us.socrata.com/api/catalog/v1?${params}`);
    for (const r of body?.results ?? []) {
      const res = r.resource;
      const domain = r.metadata?.domain;
      if (!res?.id || !domain || seen.has(res.id)) continue;
      if (!TITLE_RX.test(res.name ?? "")) continue;
      // The catalog matches nationwide; require the dataset's own text to
      // mention the city/county so a Kansas City dataset can't verify Florida.
      const hay = `${res.name ?? ""} ${res.description ?? ""} ${domain}`.toLowerCase();
      if (!hay.includes(name.toLowerCase().replace(/\./g, ""))
        && !hay.includes(name.toLowerCase())) continue;
      seen.add(res.id);
      out.push({
        id: res.id,
        title: res.name ?? null,
        domain,
        columns: res.columns_field_name ?? [],
        matchedName: name,
      });
    }
  }
  return out;
}

async function verifySocrataItem(item) {
  const map = inferFieldMap(item.columns);
  if (!isUsableMap(map) || !hasCaseSignal(map)) return null;
  const url = `https://${item.domain}/resource/${item.id}.json?$limit=25`;
  const { body: rows } = await getJson(url);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const { usable, sample } = usableRows(rows, map);
  if (usable === 0) return null;
  if (samplesLookNonFlorida(sample)) return null;
  return {
    platform: "socrata",
    title: item.title,
    matchedName: item.matchedName,
    resourceUrl: url,
    domain: item.domain,
    datasetId: item.id,
    fieldMap: map,
    rowsFetched: rows.length,
    usableRows: usable,
    sample,
  };
}

// ---------------------------------------------------------------------------
// 3. Accela Citizen Access — DETECTION ONLY. ACA is an interactive portal
//    (ASP.NET, sessions); we never scrape it. A live portal means the
//    jurisdiction manages cases in Accela, which informs the boss table
//    ("platform exists, adapter/records-request needed").
// ---------------------------------------------------------------------------

async function detectAccela(names) {
  for (const name of names.slice(0, 2)) {
    const agency = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!agency) continue;
    const url = `https://aca-prod.accela.com/${agency}/Default.aspx`;
    const r = await probeUrl(url);
    // Accela answers unknown agencies with an error page but still 200 at
    // times; require the final URL to stay on the agency path.
    if (r.ok && r.finalUrl && r.finalUrl.toUpperCase().includes(`/${agency}/`)) {
      return { platform: "accela", agency, url, note: "portal detected (no scraping — interactive)" };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Probe one county.
// ---------------------------------------------------------------------------

async function probeCounty([county, fips, cities]) {
  // County-level record types (clerk/tax collector data) skip the city fan-out.
  const names = CFG.countyLevel ? [`${county} County`, cities[0]] : [`${county} County`, ...cities];
  const probe = {
    county,
    fips,
    cities,
    verified: [], // verified sources (rows pulled, addresses + case signal)
    platformsFound: [], // detected-but-not-scrapable platforms (Accela)
    arcgisCandidates: 0,
    socrataCandidates: 0,
    status: "unverified",
    reason: null,
  };

  // ArcGIS (city-level search is the fix over the old sweep)
  const agItems = await searchArcgis(names);
  probe.arcgisCandidates = agItems.length;
  for (const item of agItems.slice(0, 5)) {
    const v = await verifyArcgisItem(item);
    if (v) probe.verified.push(v);
  }

  // Socrata global catalog
  const soItems = await searchSocrata(names);
  probe.socrataCandidates = soItems.length;
  for (const item of soItems.slice(0, 5)) {
    const v = await verifySocrataItem(item);
    if (v) probe.verified.push(v);
  }

  // Accela detection (largest city + county seat only; code enforcement only —
  // clerk-of-court records never live in Accela)
  const accela = CFG.countyLevel ? null : await detectAccela(cities);
  if (accela) probe.platformsFound.push(accela);

  if (probe.verified.length > 0) {
    probe.status = "verified";
  } else if (probe.platformsFound.length > 0) {
    probe.status = "platform_found";
    probe.reason = "case system detected but not open-data (adapter or records request needed)";
  } else {
    probe.status = "unverified";
    probe.reason =
      probe.arcgisCandidates + probe.socrataCandidates > 0
        ? "candidates found but none verified (no address-bearing case rows)"
        : "no open-data source found on arcgis.com or Socrata";
  }
  return probe;
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------

async function main() {
  let list = RECORD_TYPE === "code_violation" ? FL.filter(([c]) => !ALREADY_LIVE.has(c)) : FL;
  if (ONLY_COUNTY) list = FL.filter(([c]) => c.toLowerCase() === ONLY_COUNTY.toLowerCase());
  if (LIMIT > 0) list = list.slice(0, LIMIT);

  console.log(`Wide FL ${RECORD_TYPE} discovery — ${list.length} counties\n`);

  const probes = [];
  for (const entry of list) {
    const p = await probeCounty(entry);
    probes.push(p);
    const tag = p.status === "verified" ? "OK  " : p.status === "platform_found" ? "PLAT" : "MISS";
    const src = p.verified[0];
    console.log(
      `${tag} ${p.county.padEnd(14)} ag=${p.arcgisCandidates} so=${p.socrataCandidates}` +
        (src ? ` — ${src.platform} "${src.title}" via "${src.matchedName}" usable=${src.usableRows}` : "") +
        (p.status === "platform_found" ? ` — ${p.platformsFound[0].platform}:${p.platformsFound[0].agency}` : "") +
        (p.status === "unverified" && p.reason ? ` — ${p.reason}` : ""),
    );
  }

  // Shared-layer guard: one regional layer verifying multiple counties means
  // the catalog search is ambiguous, not the data. Demote all for a human call.
  const byUrl = new Map();
  for (const p of probes) {
    for (const v of p.verified) {
      byUrl.set(v.resourceUrl, [...(byUrl.get(v.resourceUrl) ?? []), p.county]);
    }
  }
  for (const p of probes) {
    p.verified = p.verified.map((v) => {
      const owners = byUrl.get(v.resourceUrl) ?? [];
      return owners.length > 1 ? { ...v, sharedWith: owners.filter((c) => c !== p.county) } : v;
    });
    if (p.status === "verified" && p.verified.every((v) => v.sharedWith)) {
      p.status = "needs_attribution";
      p.reason = `all verified layers are shared with other counties — manual attribution required`;
    }
  }

  const counts = { verified: 0, platform_found: 0, needs_attribution: 0, unverified: 0 };
  for (const p of probes) counts[p.status] += 1;

  console.log(`\n=== FL wide discovery summary ===`);
  console.log(`Probed:             ${probes.length}`);
  console.log(`Verified:           ${counts.verified} (${probes.filter((p) => p.status === "verified").map((p) => p.county).join(", ") || "none"})`);
  console.log(`Platform found:     ${counts.platform_found} (${probes.filter((p) => p.status === "platform_found").map((p) => p.county).join(", ") || "none"})`);
  console.log(`Needs attribution:  ${counts.needs_attribution}`);
  console.log(`Unverified:         ${counts.unverified}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const path =
    RECORD_TYPE === "code_violation"
      ? `${OUT_DIR}/fl-wide-discovery.json`
      : `${OUT_DIR}/fl-wide-discovery-${RECORD_TYPE}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recordType: RECORD_TYPE,
        method: "city-level search: arcgis.com + Socrata Discovery API + Accela detection",
        alreadyLive: [...ALREADY_LIVE],
        totals: { countiesProbed: probes.length, ...counts },
        probes,
      },
      null,
      2,
    ),
  );
  console.log(`\nReport → ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

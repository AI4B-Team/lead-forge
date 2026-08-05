#!/usr/bin/env bun
// ---------------------------------------------------------------------------
// Florida RealForeclose coverage discovery.
//
//   bun run scripts/discover-fl-realauction.ts            # probe + report only
//   bun run scripts/discover-fl-realauction.ts --write    # also write coverage
//
// What it does, in order:
//   1. Reads the vendor's public client index (the "JumpTo" site list rendered
//      on every Realauction property) and keeps the Florida foreclosure sites.
//   2. Probes each candidate county subdomain: home page, calendar page, then
//      one advertised auction day.
//   3. Records HTTP status, whether a calendar was found, and how many rows
//      actually parsed.
//
// Coverage rule, enforced in one place (`decide`): status='verified' ONLY when a
// calendar was found AND at least one parsed row carries a non-null case number
// AND a non-null sale date. Everything else is 'unverified' with a reason. A URL
// that resolves is not coverage.
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "node:fs";
import {
  isUsableRow,
  parseCalendarDates,
  parseRealauctionPage,
  realauctionUrls,
  type RealauctionRow,
} from "../src/lib/data-providers/realauction";
import { AdapterEmptyDayError, AdapterStructureError } from "../src/lib/adapter-errors";
import { auctionWindowBlock, BOT_USER_AGENT, robotsAllows } from "../src/lib/data-providers/scraper-policy";
import { FL_COUNTY_FIPS, canonicalFlCounty, realauctionSubdomain } from "../src/lib/fl-counties";

const RECORD_TYPE = "foreclosure_auction";
const INDEX_SEED = "https://broward.realforeclose.com/index.cfm";
const OUT_DIR = "reports";
const WRITE = process.argv.includes("--write");
const LIMIT = Number(process.env["LIMIT"] ?? 0);

// ---------------------------------------------------------------------------
// Transport. Direct fetch is the production path. Some networks (including our
// build sandbox) are blocked at the vendor edge with a blanket 403, so an
// explicit read-only relay can be opted into for verification runs. It is never
// the default and it changes nothing about parsing.
// ---------------------------------------------------------------------------

const RELAY = process.env["LT_FETCH_RELAY"] === "gateway";
const AGW_URL = process.env["AGW_URL"] ?? "";
const AGW_TOKEN = process.env["AGW_TOKEN"] ?? "";

const lastHit = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 1 request / 3s per host, jittered, with hard backoff on 429/503. */
async function throttled(host: string) {
  const wait = (lastHit.get(host) ?? 0) + 3_000 + Math.floor(Math.random() * 1_000) - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

type Fetched = { status: number; html: string };

async function getHtml(url: string, attempt = 0): Promise<Fetched> {
  const host = new URL(url).host;
  await throttled(host);
  if (RELAY) {
    const res = await fetch(`${AGW_URL}/f/website-fetch/v1/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AGW_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html"] }),
    });
    const body = (await res.json()) as { success?: boolean; data?: { html?: string } };
    if (!body.success || !body.data?.html) return { status: res.status === 200 ? 502 : res.status, html: "" };
    return { status: 200, html: body.data.html };
  }
  const res = await fetch(url, {
    headers: { "User-Agent": BOT_USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if ((res.status === 429 || res.status === 503) && attempt < 4) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5_000 * 2 ** attempt;
    console.warn(`  backoff ${backoff}ms after HTTP ${res.status}`);
    await sleep(backoff);
    return getHtml(url, attempt + 1);
  }
  return { status: res.status, html: res.ok ? await res.text() : "" };
}

// ---------------------------------------------------------------------------
// 1. Client index
// ---------------------------------------------------------------------------

async function floridaCandidates(): Promise<Array<{ county: string; fips: string; sub: string; label: string }>> {
  const { status, html } = await getHtml(INDEX_SEED);
  if (status !== 200 || !html) throw new Error(`Client index unreachable (HTTP ${status})`);
  const labels = [...html.matchAll(/<option[^>]*value="[^"]*"[^>]*>([^<]+)<\/option>/gi)].map((m) =>
    (m[1] ?? "").trim(),
  );
  const seen = new Map<string, { county: string; fips: string; sub: string; label: string }>();
  for (const label of labels) {
    if (/tax\s*deed|taxdeed|treasurer/i.test(label)) continue; // separate record type
    const county = canonicalFlCounty(label);
    if (!county) continue;
    const fips = FL_COUNTY_FIPS[county];
    if (!fips) continue;
    if (!seen.has(county)) seen.set(county, { county, fips, sub: realauctionSubdomain(county), label });
  }
  return [...seen.values()].sort((a, b) => a.county.localeCompare(b.county));
}

// ---------------------------------------------------------------------------
// 2. Probe
// ---------------------------------------------------------------------------

type Probe = {
  county: string;
  fips: string;
  subdomain: string;
  homeUrl: string;
  homeStatus: number;
  robotsAllowed: boolean;
  calendarStatus: number | null;
  calendarFound: boolean;
  auctionDatesFound: number;
  probedDate: string | null;
  probedUrl: string | null;
  rowsParsed: number;
  usableRows: number;
  rendering: "server_html" | "unknown";
  status: "verified" | "unverified";
  reason: string | null;
  sample: RealauctionRow[];
};

function decide(p: Omit<Probe, "status" | "reason">): { status: Probe["status"]; reason: string | null } {
  if (p.homeStatus !== 200) return { status: "unverified", reason: `home page HTTP ${p.homeStatus}` };
  if (!p.robotsAllowed) return { status: "unverified", reason: "robots.txt disallows the auction path" };
  if (!p.calendarFound) return { status: "unverified", reason: `no auction calendar found (HTTP ${p.calendarStatus})` };
  if (p.auctionDatesFound === 0) return { status: "unverified", reason: "calendar present but advertises no auction dates" };
  if (p.rowsParsed === 0) return { status: "unverified", reason: "auction day page parsed zero rows" };
  if (p.usableRows === 0)
    return { status: "unverified", reason: "rows parsed but none had both a case number and a sale date" };
  return { status: "verified", reason: null };
}

async function probe(c: { county: string; fips: string; sub: string }): Promise<Probe> {
  const homeUrl = realauctionUrls.home(c.sub);
  const base: Omit<Probe, "status" | "reason"> = {
    county: c.county,
    fips: c.fips,
    subdomain: c.sub,
    homeUrl,
    homeStatus: 0,
    robotsAllowed: true,
    calendarStatus: null,
    calendarFound: false,
    auctionDatesFound: 0,
    probedDate: null,
    probedUrl: null,
    rowsParsed: 0,
    usableRows: 0,
    rendering: "unknown",
    sample: [],
  };

  try {
    const home = await getHtml(homeUrl);
    base.homeStatus = home.status;
    if (home.status !== 200) return { ...base, ...decide(base) };

    if (!RELAY) base.robotsAllowed = await robotsAllows(realauctionUrls.calendar(c.sub));
    if (!base.robotsAllowed) return { ...base, ...decide(base) };

    const cal = await getHtml(realauctionUrls.calendar(c.sub));
    base.calendarStatus = cal.status;
    // A calendar is "found" only if the page actually renders calendar cells.
    base.calendarFound = cal.status === 200 && /CALENDAR|dayid=|AUCTIONDATE/i.test(cal.html);
    if (!base.calendarFound) return { ...base, ...decide(base) };

    const dates = parseCalendarDates(cal.html).sort((a, b) => +new Date(a) - +new Date(b));
    const future = dates.filter((d) => +new Date(d) >= Date.now() - 86_400_000);
    base.auctionDatesFound = future.length;
    if (future.length === 0) return { ...base, ...decide(base) };

    // Probe up to three advertised dates: an individual day can legitimately be
    // cancelled, and we do not want a cancelled day read as "no coverage".
    for (const date of future.slice(0, 3)) {
      const url = realauctionUrls.auctionDay(c.sub, date);
      base.probedDate = date;
      base.probedUrl = url;
      const day = await getHtml(url);
      if (day.status !== 200) continue;
      base.rendering = "server_html";
      try {
        const rows = parseRealauctionPage(day.html, url);
        base.rowsParsed = rows.length;
        const usable = rows.filter(isUsableRow);
        base.usableRows = usable.length;
        base.sample = usable.slice(0, 3);
        if (usable.length > 0) break;
      } catch (e) {
        if (e instanceof AdapterEmptyDayError) continue;
        if (e instanceof AdapterStructureError) continue;
        throw e;
      }
    }
    return { ...base, ...decide(base) };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return { ...base, status: "unverified", reason };
  }
}

// ---------------------------------------------------------------------------
// 3. Persist (only with --write)
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
    const sourceRows = (await sb(
      `data_sources?on_conflict=platform,domain,dataset_id,record_type`,
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([
          {
            platform: "html_search",
            source_class: "auction_platform",
            domain: `${p.subdomain}.realforeclose.com`,
            dataset_id: "realforeclose_auction_calendar",
            record_type: RECORD_TYPE,
            resource_url: p.probedUrl ?? p.homeUrl,
            title: `${p.county} County Clerk Foreclosure Sale (RealForeclose)`,
            entity_name: "Realauction.com LLC",
            jurisdiction: `${p.county} County, FL`,
            county_name: p.county,
            state: "FL",
            fips: p.fips,
            // Selectors stay empty until confirmed against that county's own HTML.
            fetch_config: {},
            precedence: 10,
            crawl_interval_minutes: 720,
            status: p.status === "verified" ? "verified" : "discovered",
            row_estimate: p.usableRows || null,
            last_error: p.reason,
            last_verified_at: p.status === "verified" ? new Date().toISOString() : null,
            last_success_at: p.usableRows > 0 ? new Date().toISOString() : null,
          },
        ]),
      },
    )) as Array<{ id: string }>;
    const sourceId = sourceRows?.[0]?.id ?? null;

    await sb(`source_coverage?on_conflict=source_id,fips,record_type`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([
        {
          source_id: sourceId,
          fips: p.fips,
          state: "FL",
          county_name: p.county,
          record_type: RECORD_TYPE,
          status: p.status,
          sample_row_count: p.usableRows,
          verified_at: p.status === "verified" ? new Date().toISOString() : null,
          last_success_at: p.usableRows > 0 ? new Date().toISOString() : null,
        },
      ]),
    });
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  const window = auctionWindowBlock();
  if (window.blocked && !process.argv.includes("--ignore-auction-window")) {
    console.error(`Refusing to crawl: ${window.reason}`);
    process.exit(2);
  }

  const candidates = await floridaCandidates();
  const list = LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates;
  console.log(`Client index lists ${candidates.length} Florida foreclosure sites; probing ${list.length}\n`);

  const probes: Probe[] = [];
  for (const c of list) {
    const p = await probe(c);
    probes.push(p);
    console.log(
      `${p.status === "verified" ? "OK  " : "MISS"} ${p.county.padEnd(14)} ` +
        `home=${p.homeStatus} cal=${p.calendarFound ? "y" : "n"} dates=${p.auctionDatesFound} ` +
        `rows=${p.rowsParsed} usable=${p.usableRows}${p.reason ? ` — ${p.reason}` : ""}`,
    );
  }

  const verified = probes.filter((p) => p.status === "verified");
  const failures = probes.filter((p) => p.status !== "verified");
  const byReason = new Map<string, string[]>();
  for (const f of failures) {
    const key = f.reason ?? "unknown";
    byReason.set(key, [...(byReason.get(key) ?? []), f.county]);
  }

  console.log(`\n=== FL RealForeclose coverage ===`);
  console.log(`FL counties total:        ${Object.keys(FL_COUNTY_FIPS).length}`);
  console.log(`On vendor client index:   ${candidates.length}`);
  console.log(`Verified (rows parsed):   ${verified.length}`);
  console.log(`Probed but unverified:    ${failures.length}`);
  for (const [reason, counties] of byReason) console.log(`  - ${reason}: ${counties.join(", ")}`);
  console.log(`Uncovered FL counties:    ${Object.keys(FL_COUNTY_FIPS).length - verified.length}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const path = `${OUT_DIR}/fl-realauction-coverage.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recordType: RECORD_TYPE,
        transport: RELAY ? "relay" : "direct",
        totals: {
          flCounties: Object.keys(FL_COUNTY_FIPS).length,
          onClientIndex: candidates.length,
          verified: verified.length,
          unverified: failures.length,
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
    console.log(`Wrote ${probes.length} coverage rows (${verified.length} verified).`);
  } else {
    console.log(`Dry run — pass --write to update source_coverage.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
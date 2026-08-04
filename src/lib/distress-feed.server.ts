/**
 * Distress Feed — server-only data layer.
 *
 * Reads for the public marketing pages go through SECURITY DEFINER helpers that
 * return aggregates or surname-masked rows only, so an unauthenticated visitor
 * can never pull the raw feed. Writes happen from the nightly pull and from
 * parsed public-records-request responses, and every attempt is logged to
 * distress_pulls so each county page can state its real last-pull date.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { countyKey, RECORD_TYPES, type DistressRecordType } from "./distress-feed.shared";

/** Publishable-key client: public reads only, no session persistence. */
export function publicClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const supabase = publicClient();
  // The distress_* helpers are declared in SQL and callable by anon.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export type FeedTotals = {
  total_records: number;
  counties: number;
  states: number;
  added_this_week: number;
  last_pull_at: string | null;
};

export type StateSummary = {
  state: string;
  counties: number;
  total_records: number;
  new_this_week: number;
  last_pull_at: string | null;
};

export type CountySummary = {
  county: string;
  fips: string | null;
  total_records: number;
  new_this_week: number;
  record_types: string[];
  last_pull_at: string | null;
};

export type PreviewRow = {
  record_type: string;
  filed_date: string | null;
  owner_masked: string;
  property_city: string | null;
  property_zip: string | null;
  amount: number | null;
  status: string | null;
};

export async function feedTotals(): Promise<FeedTotals> {
  const rows = await rpc<FeedTotals[]>("distress_feed_totals");
  return (
    rows?.[0] ?? { total_records: 0, counties: 0, states: 0, added_this_week: 0, last_pull_at: null }
  );
}

export async function stateSummaries(): Promise<StateSummary[]> {
  return (await rpc<StateSummary[]>("distress_state_summary")) ?? [];
}

export async function countySummaries(state: string): Promise<CountySummary[]> {
  return (await rpc<CountySummary[]>("distress_county_summary", { _state: state })) ?? [];
}

export async function countyPreview(state: string, county: string, limit = 10): Promise<PreviewRow[]> {
  return (
    (await rpc<PreviewRow[]>("distress_county_preview", {
      _state: state,
      _county: county,
      _limit: limit,
    })) ?? []
  );
}

export async function topCounties(limit = 20) {
  return (await rpc<Array<{ state: string; county: string; total_records: number }>>(
    "distress_top_counties",
    { _limit: limit },
  )) ?? [];
}

// ---------------------------------------------------------------------------
// Guides
// ---------------------------------------------------------------------------

export type GuideRow = {
  fips: string;
  state: string;
  county: string;
  record_type: string;
  title: string | null;
  portal_url: string;
  intro: string | null;
  steps: Array<{ heading?: string; body: string }>;
  fields: string[];
  notes: string | null;
  updated_at: string;
};

export async function listGuides(state?: string): Promise<GuideRow[]> {
  const supabase = publicClient();
  let q = supabase
    .from("distress_guides")
    .select("fips, state, county, record_type, title, portal_url, intro, steps, fields, notes, updated_at")
    .eq("published", true)
    .order("state")
    .order("county");
  if (state) q = q.ilike("state", state);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GuideRow[];
}

export async function getGuide(state: string, county: string, recordType: string): Promise<GuideRow | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("distress_guides")
    .select("fips, state, county, record_type, title, portal_url, intro, steps, fields, notes, updated_at")
    .ilike("state", state)
    .ilike("county", county)
    .eq("record_type", recordType)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as GuideRow) ?? null;
}

// ---------------------------------------------------------------------------
// Nightly pull
// ---------------------------------------------------------------------------

export type RawFiling = {
  doc_number: string;
  filed_date?: string | null;
  owner_first?: string | null;
  owner_last?: string | null;
  company_entity?: string | null;
  property_address?: string | null;
  property_city?: string | null;
  property_state?: string | null;
  property_zip?: string | null;
  amount?: number | null;
  auction_date?: string | null;
  status?: string | null;
  parcel_apn?: string | null;
  source_url?: string | null;
  raw?: Record<string, unknown>;
};

export type PullTarget = {
  state: string;
  county: string;
  recordType: DistressRecordType;
  /** Where the filings come from. `records_request` targets are ingested by the
   * records-request parser instead of being fetched here. */
  path: "portal" | "open_data" | "records_request";
  portalUrl?: string;
  pull?: () => Promise<RawFiling[]>;
};

/** Split "SMITH, JOHN A" or "John Smith" into first/last without guessing hard. */
export function splitOwner(name: string): { first: string | null; last: string | null; entity: string | null } {
  const value = name.replace(/\s+/g, " ").trim();
  if (!value) return { first: null, last: null, entity: null };
  if (/\b(LLC|INC|TRUST|CORP|LP|LTD|COMPANY|ASSOC|BANK|FOUNDATION)\b/i.test(value)) {
    return { first: null, last: null, entity: value };
  }
  if (value.includes(",")) {
    const [last, rest] = value.split(",");
    return { first: (rest ?? "").trim().split(" ")[0] || null, last: last.trim() || null, entity: null };
  }
  const parts = value.split(" ");
  if (parts.length === 1) return { first: null, last: parts[0], entity: null };
  return { first: parts[0], last: parts[parts.length - 1], entity: null };
}

/**
 * Hillsborough County tax deed sales, published by the clerk on RealAuction.
 * The calendar endpoint returns the auction days; each day returns its items.
 * Parsed defensively — a layout change must degrade to "0 found, error logged",
 * never to bad rows in a shared table.
 */
async function pullHillsboroughTaxDeed(): Promise<RawFiling[]> {
  const base = "https://hillsborough.realtaxdeed.com";
  const res = await fetch(`${base}/index.cfm?zaction=AUCTION&Zmethod=UPCOMING`, {
    headers: { "User-Agent": "LeadTraceBot/1.0 (+https://leadtrace.io/bot)" },
  });
  if (!res.ok) throw new Error(`RealAuction responded ${res.status}`);
  const html = await res.text();

  const filings: RawFiling[] = [];
  const blocks = html.split(/class="AUCTION_ITEM/).slice(1);
  for (const block of blocks) {
    const field = (label: string) => {
      const re = new RegExp(`${label}[^<]*<[^>]*>\\s*([^<]+)`, "i");
      return block.match(re)?.[1]?.trim() ?? null;
    };
    const doc = field("Case #") ?? field("Tax Deed");
    if (!doc) continue;
    const owner = field("Property Owner") ?? "";
    const { first, last, entity } = splitOwner(owner);
    const amountText = field("Opening Bid")?.replace(/[^0-9.]/g, "");
    filings.push({
      doc_number: doc,
      filed_date: null,
      owner_first: first,
      owner_last: last,
      company_entity: entity,
      property_address: field("Property Address"),
      property_city: field("City"),
      property_state: "FL",
      property_zip: field("Zip"),
      amount: amountText ? Number(amountText) : null,
      auction_date: field("Auction Date"),
      status: field("Auction Status") ?? "scheduled",
      parcel_apn: field("Parcel ID"),
      source_url: base,
      raw: { source: "realtaxdeed", county: "Hillsborough" },
    });
  }
  return filings;
}

export const PULL_TARGETS: PullTarget[] = [
  {
    state: "FL",
    county: "Hillsborough",
    recordType: "tax_deed",
    path: "portal",
    portalUrl: "https://hillsborough.realtaxdeed.com",
    pull: pullHillsboroughTaxDeed,
  },
  {
    // Hillsborough probate is not published as a machine-readable dataset, so it
    // arrives through the standing public-records request to the clerk and is
    // ingested by the records-request parser into this same table.
    state: "FL",
    county: "Hillsborough",
    recordType: "probate",
    path: "records_request",
    portalUrl: "https://hover.hillsclerk.com/",
  },
];

/**
 * Upsert filings into the shared feed. The (fips, record_type, doc_number)
 * unique constraint is what makes a nightly re-pull idempotent.
 */
export async function ingestDistressRecords(
  supabase: SupabaseClient<Database>,
  target: { state: string; county: string; recordType: string },
  filings: RawFiling[],
): Promise<number> {
  if (!filings.length) return 0;
  const fips = countyKey(target.state, target.county);
  const rows = filings.map((f) => ({
    fips,
    state: target.state.toUpperCase(),
    county: target.county,
    record_type: target.recordType,
    doc_number: f.doc_number,
    filed_date: f.filed_date ?? null,
    pulled_date: new Date().toISOString().slice(0, 10),
    owner_first: f.owner_first ?? null,
    owner_last: f.owner_last ?? null,
    company_entity: f.company_entity ?? null,
    property_address: f.property_address ?? null,
    property_city: f.property_city ?? null,
    property_state: f.property_state ?? target.state.toUpperCase(),
    property_zip: f.property_zip ?? null,
    amount: f.amount ?? null,
    auction_date: f.auction_date ?? null,
    status: f.status ?? null,
    parcel_apn: f.parcel_apn ?? null,
    source_url: f.source_url ?? null,
    raw: (f.raw ?? {}) as never,
  }));

  const { error, count } = await supabase
    .from("distress_records")
    .upsert(rows as never, { onConflict: "fips,record_type,doc_number", count: "exact" });
  if (error) throw new Error(error.message);
  return count ?? rows.length;
}

/** One nightly sweep across every configured county + record type. */
export async function runNightlyPulls(): Promise<{
  ok: boolean;
  targets: number;
  results: Array<{ county: string; recordType: string; found: number; added: number; error?: string }>;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: Array<{ county: string; recordType: string; found: number; added: number; error?: string }> = [];

  for (const target of PULL_TARGETS) {
    if (target.path === "records_request" || !target.pull) {
      // Nothing to fetch: this county/type is supplied by the records-request agent.
      continue;
    }
    const startedAt = new Date().toISOString();
    let found = 0;
    let added = 0;
    let failure: string | undefined;
    try {
      const filings = await target.pull();
      found = filings.length;
      added = await ingestDistressRecords(supabaseAdmin, target, filings);
    } catch (err) {
      failure = err instanceof Error ? err.message : "Pull failed";
    }
    await supabaseAdmin.from("distress_pulls").insert({
      fips: countyKey(target.state, target.county),
      state: target.state.toUpperCase(),
      county: target.county,
      record_type: target.recordType,
      status: failure ? "error" : "ok",
      records_found: found,
      records_added: added,
      error: failure ?? null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    } as never);
    results.push({ county: target.county, recordType: target.recordType, found, added, error: failure });
  }

  return { ok: results.every((r) => !r.error), targets: results.length, results };
}

/** Record types we are configured to pull for a county, for the county page. */
export function configuredTypes(state: string, county: string): string[] {
  return PULL_TARGETS.filter(
    (t) => t.state.toLowerCase() === state.toLowerCase() && t.county.toLowerCase() === county.toLowerCase(),
  ).map((t) => t.recordType);
}

export const ALL_RECORD_TYPE_IDS = RECORD_TYPES.map((r) => r.id);

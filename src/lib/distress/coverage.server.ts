// ---------------------------------------------------------------------------
// Coverage gate. A county/record type is runnable only when source_coverage
// carries a `verified` row for it. Nothing else runs — we would rather tell an
// operator "we don't look there yet" than hand them fabricated records.
// ---------------------------------------------------------------------------

import type { CoverageRow } from "../coverage.shared";
import { splitCountyLabel } from "../coverage.shared";

/** Thrown when a run has no verified coverage at all. */
export class NoCoverageError extends Error {
  readonly code = "no_coverage";
  constructor(message: string) {
    super(message);
    this.name = "NoCoverageError";
  }
}

/** Thrown when the request is too vague to price — e.g. a state with no counties. */
export class ScopeTooBroadError extends Error {
  readonly code = "scope_too_broad";
  constructor(message: string) {
    super(message);
    this.name = "ScopeTooBroadError";
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Primary gate: is this FIPS + record type verified? */
export async function hasCoverage(fips: string, recordType: string): Promise<boolean> {
  const supabase = await admin();
  const { data } = await supabase
    .from("source_coverage")
    .select("id")
    .eq("status", "verified")
    .eq("fips", fips)
    .eq("record_type", recordType)
    .limit(1);
  return (data ?? []).length > 0;
}

/** Every verified row, for label-based lookups and UI hints. */
export async function verifiedCoverage(): Promise<CoverageRow[]> {
  const supabase = await admin();
  const { data } = await supabase
    .from("source_coverage")
    .select("fips, state, county_name, record_type, status, verified_at, last_success_at, sample_row_count")
    .eq("status", "verified");
  return (data ?? []) as unknown as CoverageRow[];
}

/**
 * County labels are how jobs and the assistant talk about geography
 * ("Cook, IL"), so resolve them to verified FIPS before running.
 */
export async function coveredFipsForCounty(
  countyLabel: string,
  recordType: string,
): Promise<string[]> {
  const { county, state } = splitCountyLabel(countyLabel);
  const supabase = await admin();
  let q = supabase
    .from("source_coverage")
    .select("fips")
    .eq("status", "verified")
    .eq("record_type", recordType)
    .ilike("county_name", county);
  if (state) q = q.eq("state", state);
  const { data } = await q;
  return (data ?? []).map((r) => (r as { fips: string }).fips);
}

export async function hasCountyCoverage(
  countyLabel: string,
  recordType: string,
): Promise<boolean> {
  return (await coveredFipsForCounty(countyLabel, recordType)).length > 0;
}

export type CoveragePair = { county: string; recordType: string };
export type CoverageSplit = {
  covered: CoveragePair[];
  uncovered: CoveragePair[];
  /** Counties with at least one covered record type. */
  coveredCounties: string[];
  uncoveredCounties: string[];
};

/** Split a job's selections so the covered portion can still run. */
export async function splitSelections(
  counties: string[],
  recordTypes: string[],
): Promise<CoverageSplit> {
  const covered: CoveragePair[] = [];
  const uncovered: CoveragePair[] = [];
  for (const county of counties) {
    for (const recordType of recordTypes) {
      const ok = await hasCountyCoverage(county, recordType);
      (ok ? covered : uncovered).push({ county, recordType });
    }
  }
  const coveredCounties = [...new Set(covered.map((p) => p.county))];
  const uncoveredCounties = [...new Set(uncovered.map((p) => p.county))].filter(
    (c) => !coveredCounties.includes(c),
  );
  return { covered, uncovered, coveredCounties, uncoveredCounties };
}

/**
 * Log demand for an uncovered county/record type. Uses the existing adapter
 * request backlog so the platform roadmap ranks coverage gaps beside every
 * other source request instead of in a second, competing queue.
 */
export async function logCoverageRequests(
  pairs: CoveragePair[],
  ctx: { workspaceId: string; requestedBy?: string | null },
): Promise<number> {
  if (!pairs.length) return 0;
  const supabase = await admin();
  const rows = pairs.map((p) => ({
    workspace_id: ctx.workspaceId,
    requested_by: ctx.requestedBy ?? null,
    type: "coverage",
    county: p.county,
    record_type: p.recordType,
    source_label: `${p.county} — ${p.recordType}`,
    status: "queued",
  }));
  const { error } = await supabase.from("adapter_requests").insert(rows as never);
  if (error) return 0;
  return rows.length;
}

/** How many workspaces asked for this county/record type. Drives the UI count. */
export async function coverageDemand(county: string, recordType: string): Promise<number> {
  const supabase = await admin();
  const { data } = await supabase
    .from("adapter_requests")
    .select("workspace_id")
    .ilike("county", county)
    .eq("record_type", recordType)
    .limit(1000);
  return new Set((data ?? []).map((r) => (r as { workspace_id: string }).workspace_id)).size;
}

export type MatrixCell = {
  state: string;
  record_type: string;
  verified_counties: number;
  total_counties: number;
  last_success_at: string | null;
};

/** states × record types grid for the admin coverage matrix. */
export async function coverageMatrix(): Promise<{
  cells: MatrixCell[];
  states: string[];
  recordTypes: string[];
}> {
  const supabase = await admin();
  const { data } = await supabase
    .from("source_coverage")
    .select("state, county_name, record_type, status, last_success_at");
  const rows = (data ?? []) as unknown as Array<{
    state: string;
    county_name: string | null;
    record_type: string;
    status: string;
    last_success_at: string | null;
  }>;

  const { data: types } = await supabase.from("record_types").select("name").order("sort_order");
  const recordTypes = ((types ?? []) as Array<{ name: string }>).map((t) => t.name);

  const byCell = new Map<string, MatrixCell>();
  for (const r of rows) {
    const key = `${r.state}::${r.record_type}`;
    const cell =
      byCell.get(key) ??
      ({
        state: r.state,
        record_type: r.record_type,
        verified_counties: 0,
        total_counties: 0,
        last_success_at: null,
      } satisfies MatrixCell);
    cell.total_counties += 1;
    if (r.status === "verified") cell.verified_counties += 1;
    if (r.last_success_at && (!cell.last_success_at || r.last_success_at > cell.last_success_at)) {
      cell.last_success_at = r.last_success_at;
    }
    byCell.set(key, cell);
  }

  const cells = [...byCell.values()];
  const states = [...new Set(cells.map((c) => c.state))].sort();
  const extra = [...new Set(cells.map((c) => c.record_type))].filter((t) => !recordTypes.includes(t));
  return { cells, states, recordTypes: [...recordTypes, ...extra] };
}
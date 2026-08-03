/**
 * Shared shapes + pure helpers for the database-backed reference data
 * (industries, niches, record types, county coverage). The rows live in
 * Supabase so coverage and trades can expand without a redeploy.
 */
export type CoverageStatus = "live" | "beta" | "requested" | "unknown";

export type IndustryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

export type RecordTypeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  sort_order: number;
};

export type CountyCoverageRow = {
  county_name: string;
  state: string;
  source_type: string;
  status: string;
  fips: string | null;
  notes: string | null;
};

export type ReferenceData = {
  industries: IndustryRow[];
  niches: IndustryRow[];
  recordTypes: RecordTypeRow[];
  countyCoverage: CountyCoverageRow[];
};

export const EMPTY_REFERENCE_DATA: ReferenceData = {
  industries: [],
  niches: [],
  recordTypes: [],
  countyCoverage: [],
};

/** Coverage rows are keyed on the display form counties are stored as. */
export function coverageLabel(row: CountyCoverageRow): string {
  return `${row.county_name}, ${row.state}`;
}

/**
 * County coverage only constrains public-records adapters, which are built
 * county by county. Business / local scrapes run through the Google Maps
 * scraper and have no geographic restriction, so they always report live.
 */
export function coverageForCounty(
  rows: readonly CountyCoverageRow[],
  county: string,
  sourceType?: string | null,
): CoverageStatus {
  if (sourceType !== "records") return "live";
  const needle = county.trim().toLowerCase();
  const hit = rows.find(
    (r) => r.source_type === "records" && coverageLabel(r).toLowerCase() === needle,
  );
  return (hit?.status as CoverageStatus | undefined) ?? "unknown";
}

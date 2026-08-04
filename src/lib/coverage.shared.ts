// Shared coverage vocabulary. Kept client-safe so selectors, result screens and
// the admin matrix all describe coverage with the same words.

export type CoverageStatus = "unverified" | "verified" | "degraded" | "retired";

export type CoverageRow = {
  fips: string;
  state: string;
  county_name: string | null;
  record_type: string;
  status: string;
  verified_at: string | null;
  last_success_at: string | null;
  sample_row_count: number | null;
};

/** "Hillsborough, FL" → { county: "Hillsborough", state: "FL" } */
export function splitCountyLabel(label: string): { county: string; state: string } {
  const [county, state] = label.split(",").map((s) => s.trim());
  return { county: county ?? label.trim(), state: (state ?? "").toUpperCase() };
}

export function coverageKey(county: string, recordType: string): string {
  return `${county.trim().toLowerCase()}::${recordType.trim().toLowerCase()}`;
}

/** Does this (county label, record type) pair appear in the verified set? */
export function isCovered(
  verified: CoverageRow[],
  countyLabel: string,
  recordType: string,
): boolean {
  const { county, state } = splitCountyLabel(countyLabel);
  const c = county.toLowerCase();
  return verified.some(
    (r) =>
      r.status === "verified" &&
      r.record_type.toLowerCase() === recordType.trim().toLowerCase() &&
      (!state || r.state.toUpperCase() === state) &&
      (r.county_name ?? "").toLowerCase() === c,
  );
}

/** Most recent successful pull for a county/record type, for the zero-result state. */
export function lastSuccessFor(
  verified: CoverageRow[],
  countyLabel: string,
  recordType: string,
): string | null {
  const { county, state } = splitCountyLabel(countyLabel);
  const c = county.toLowerCase();
  const times = verified
    .filter(
      (r) =>
        r.record_type.toLowerCase() === recordType.trim().toLowerCase() &&
        (!state || r.state.toUpperCase() === state) &&
        (r.county_name ?? "").toLowerCase() === c,
    )
    .map((r) => r.last_success_at)
    .filter((t): t is string => Boolean(t))
    .sort();
  return times.length ? times[times.length - 1]! : null;
}
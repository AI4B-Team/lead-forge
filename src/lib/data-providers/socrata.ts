// ---------------------------------------------------------------------------
// Socrata adapter. Two halves:
//   1. Discovery — the Socrata Discovery API (api.us.socrata.com) searches
//      EVERY Socrata domain at once, so one keyword sweep finds candidate
//      datasets across hundreds of counties with no per-county engineering.
//   2. Fetch — pull rows from any discovered dataset via its SoQL endpoint
//      using the stored field map.
// ---------------------------------------------------------------------------

import { politeJson } from "./scraper-policy";
import {
  DISCOVERY_KEYWORDS,
  inferFieldMap,
  isUsableMap,
  normalizeRows,
  type DiscoveryRecordType,
  type FieldMap,
} from "./source-mapping";
import type { RawLead } from "./index";

const DISCOVERY_URL = "https://api.us.socrata.com/api/catalog/v1";

export type DiscoveredSource = {
  platform: "socrata";
  domain: string;
  dataset_id: string;
  resource_url: string;
  title: string;
  jurisdiction: string | null;
  county_name: string | null;
  state: string | null;
  record_type: string;
  field_map: FieldMap;
  row_estimate: number | null;
};

type CatalogResult = {
  resource?: {
    id?: string;
    name?: string;
    columns_field_name?: string[];
    rows_updated_at?: string;
  };
  metadata?: { domain?: string };
  classification?: { domain_category?: string };
};

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

/** Guess jurisdiction + state from a Socrata domain like data.cityoftampa.fl.gov. */
function parseDomain(domain: string): { jurisdiction: string | null; state: string | null } {
  const parts = domain.toLowerCase().split(".");
  const state = parts.map((p) => p.toUpperCase()).find((p) => p.length === 2 && US_STATES.has(p)) ?? null;
  const nameish = parts.find((p) => /city|county|town|data|opendata/.test(p) && p.length > 6) ?? parts[1] ?? null;
  const jurisdiction = nameish
    ? nameish
        .replace(/^(data|opendata)$/i, "")
        .replace(/(cityof|countyof|townof)/i, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || null
    : null;
  return { jurisdiction, state };
}

/**
 * Sweep the Socrata catalog for one record type. Returns only datasets whose
 * columns include something we can turn into an address.
 */
export async function discoverSocrataSources(
  recordType: DiscoveryRecordType,
  opts: { limit?: number } = {},
): Promise<DiscoveredSource[]> {
  const out: DiscoveredSource[] = [];
  const seen = new Set<string>();
  for (const keyword of DISCOVERY_KEYWORDS[recordType]) {
    const params = new URLSearchParams({
      q: keyword,
      only: "dataset",
      limit: String(Math.min(opts.limit ?? 40, 100)),
    });
    let results: CatalogResult[] = [];
    try {
      const json = await politeJson<{ results?: CatalogResult[] }>(`${DISCOVERY_URL}?${params}`);
      results = json.results ?? [];
    } catch {
      continue;
    }
    for (const r of results) {
      const domain = r.metadata?.domain ?? "";
      const id = r.resource?.id ?? "";
      const columns = r.resource?.columns_field_name ?? [];
      if (!domain || !id || columns.length === 0) continue;
      const key = `${domain}:${id}`;
      if (seen.has(key)) continue;
      const field_map = inferFieldMap(columns);
      if (!isUsableMap(field_map)) continue;
      seen.add(key);
      const { jurisdiction, state } = parseDomain(domain);
      out.push({
        platform: "socrata",
        domain,
        dataset_id: id,
        resource_url: `https://${domain}/resource/${id}.json`,
        title: r.resource?.name ?? id,
        jurisdiction,
        county_name: jurisdiction,
        state,
        record_type: recordType,
        field_map,
        row_estimate: null,
      });
    }
  }
  return out;
}

/** Sanitize a YYYY-MM-DD date before interpolating it into SoQL. */
function safeDate(v?: string | null): string | null {
  if (!v) return null;
  const m = /^\d{4}-\d{2}-\d{2}/.exec(v.trim());
  return m ? m[0] : null;
}

export async function fetchSocrataRows(args: {
  domain: string;
  datasetId: string;
  fieldMap: FieldMap;
  recordType: string;
  county: string;
  state?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit: number;
  offset?: number;
}): Promise<RawLead[]> {
  const where: string[] = [];
  const addrCol = args.fieldMap.address ?? args.fieldMap.street_name;
  if (addrCol) where.push(`${addrCol} IS NOT NULL`);
  const dateCol = args.fieldMap.case_date;
  const from = safeDate(args.dateFrom);
  const to = safeDate(args.dateTo);
  if (dateCol && from) where.push(`${dateCol} >= '${from}T00:00:00'`);
  if (dateCol && to) where.push(`${dateCol} <= '${to}T23:59:59'`);
  const params = new URLSearchParams({
    $limit: String(args.limit),
    $offset: String(args.offset ?? 0),
  });
  if (dateCol) params.set("$order", `${dateCol} DESC`);
  if (where.length) params.set("$where", where.join(" AND "));
  const rows = await politeJson<Array<Record<string, unknown>>>(
    `https://${args.domain}/resource/${args.datasetId}.json?${params}`,
  );
  return normalizeRows(rows, args.fieldMap, {
    recordType: args.recordType,
    county: args.county,
    state: args.state ?? null,
    provider: `${args.domain} Open Data (Socrata)`,
    casePrefix: "SOC",
  });
}

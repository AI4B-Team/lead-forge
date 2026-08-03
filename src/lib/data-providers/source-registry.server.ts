// ---------------------------------------------------------------------------
// Resolves a (county, record type) pair to the best available access path and
// runs it. Order of preference is fixed:
//
//   1. Hand-coded open-data API  (county-records.ts — verified, best mapped)
//   2. Catalogued Socrata dataset
//   3. Catalogued ArcGIS feature service
//   4. Catalogued bulk file
//   5. Public records request      (records-requests.server.ts — async, by email)
//   6. Browser automation          (human-authenticated sessions only)
// ---------------------------------------------------------------------------

import type { RawLead } from "./index";
import type { FieldMap } from "./source-mapping";

export type AccessPath =
  | "open_data"
  | "arcgis"
  | "bulk_file"
  | "records_request"
  | "browser"
  | "not_permitted";

type SourceRow = {
  id: string;
  platform: "socrata" | "arcgis" | "bulk_file";
  domain: string;
  dataset_id: string | null;
  resource_url: string | null;
  county_name: string | null;
  state: string | null;
  record_type: string;
  field_map: FieldMap;
};

const PLATFORM_ORDER: Record<SourceRow["platform"], number> = { socrata: 0, arcgis: 1, bulk_file: 2 };

/**
 * Enabled catalogued sources for a county, ordered by preference. Matching is
 * loose on county because open-data domains name themselves inconsistently.
 */
async function catalogedSources(county: string, recordType: string): Promise<SourceRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [name, state] = county.split(",").map((s) => s.trim());
  let query = supabaseAdmin
    .from("data_sources")
    .select("id, platform, domain, dataset_id, resource_url, county_name, state, record_type, field_map")
    .eq("status", "enabled")
    .eq("record_type", recordType);
  if (name) query = query.ilike("county_name", `%${name}%`);
  if (state) query = query.eq("state", state);
  const { data } = await query.limit(5);
  return ((data ?? []) as unknown as SourceRow[]).sort(
    (a, b) => PLATFORM_ORDER[a.platform] - PLATFORM_ORDER[b.platform],
  );
}

export type CatalogFetchArgs = {
  county: string;
  recordType: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
  offset?: number;
};

/**
 * Try every catalogued source for this county/record type until one returns
 * rows. Returns null when nothing is catalogued so the caller can fall through
 * to the records-request path. Failures are recorded on the source row.
 */
export async function fetchCatalogedRecords(args: CatalogFetchArgs): Promise<RawLead[] | null> {
  const sources = await catalogedSources(args.county, args.recordType);
  if (sources.length === 0) return null;
  const limit = Math.min(Math.max(args.limit ?? 25, 1), 200);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (const s of sources) {
    try {
      let rows: RawLead[] = [];
      if (s.platform === "socrata" && s.dataset_id) {
        const { fetchSocrataRows } = await import("./socrata");
        rows = await fetchSocrataRows({
          domain: s.domain,
          datasetId: s.dataset_id,
          fieldMap: s.field_map,
          recordType: args.recordType,
          county: args.county,
          state: s.state,
          dateFrom: args.dateFrom ?? null,
          dateTo: args.dateTo ?? null,
          limit,
          offset: args.offset ?? 0,
        });
      } else if (s.platform === "arcgis" && s.resource_url) {
        const { fetchArcgisRows } = await import("./arcgis");
        rows = await fetchArcgisRows({
          layerUrl: s.resource_url,
          fieldMap: s.field_map,
          recordType: args.recordType,
          county: args.county,
          state: s.state,
          dateFrom: args.dateFrom ?? null,
          dateTo: args.dateTo ?? null,
          limit,
          offset: args.offset ?? 0,
        });
      } else if (s.platform === "bulk_file" && s.resource_url) {
        const { fetchBulkFileRows } = await import("./bulk-file");
        rows = await fetchBulkFileRows({
          fileUrl: s.resource_url,
          fieldMap: s.field_map,
          recordType: args.recordType,
          county: args.county,
          state: s.state,
          limit,
        });
      }
      if (rows.length > 0) {
        await supabaseAdmin
          .from("data_sources")
          .update({ last_verified_at: new Date().toISOString(), last_error: null })
          .eq("id", s.id);
        return rows;
      }
    } catch (err) {
      await supabaseAdmin
        .from("data_sources")
        .update({ status: "failed", last_error: err instanceof Error ? err.message : String(err) })
        .eq("id", s.id);
    }
  }
  return [];
}

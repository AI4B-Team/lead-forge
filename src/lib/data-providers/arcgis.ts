// ---------------------------------------------------------------------------
// ArcGIS / Esri Feature Service adapter. Most county GIS portals expose
//   /FeatureServer/{layer}/query?where=1=1&f=json
// so this single adapter covers hundreds of counties once a layer URL is
// catalogued in data_sources.
// ---------------------------------------------------------------------------

import { politeJson } from "./scraper-policy";
import { inferFieldMap, isUsableMap, normalizeRows, type FieldMap } from "./source-mapping";
import type { RawLead } from "./index";

type LayerMeta = { fields?: Array<{ name?: string }>; name?: string; error?: unknown };

/** Read a layer's schema and infer a field map — used when cataloguing. */
export async function probeArcgisLayer(layerUrl: string): Promise<{
  title: string | null;
  columns: string[];
  field_map: FieldMap;
  usable: boolean;
}> {
  const meta = await politeJson<LayerMeta>(`${layerUrl.replace(/\/$/, "")}?f=json`);
  const columns = (meta.fields ?? []).map((f) => f.name ?? "").filter(Boolean);
  const field_map = inferFieldMap(columns);
  return { title: meta.name ?? null, columns, field_map, usable: isUsableMap(field_map) };
}

function safeDate(v?: string | null): string | null {
  if (!v) return null;
  const m = /^\d{4}-\d{2}-\d{2}/.exec(v.trim());
  return m ? m[0] : null;
}

export async function fetchArcgisRows(args: {
  layerUrl: string;
  fieldMap: FieldMap;
  recordType: string;
  county: string;
  state?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit: number;
  offset?: number;
}): Promise<RawLead[]> {
  const dateCol = args.fieldMap.case_date;
  const from = safeDate(args.dateFrom);
  const to = safeDate(args.dateTo);
  const clauses: string[] = [];
  if (dateCol && from) clauses.push(`${dateCol} >= DATE '${from}'`);
  if (dateCol && to) clauses.push(`${dateCol} <= DATE '${to}'`);
  const params = new URLSearchParams({
    where: clauses.length ? clauses.join(" AND ") : "1=1",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
    resultRecordCount: String(args.limit),
    resultOffset: String(args.offset ?? 0),
  });
  if (dateCol) params.set("orderByFields", `${dateCol} DESC`);
  const json = await politeJson<{ features?: Array<{ attributes?: Record<string, unknown> }>; error?: { message?: string } }>(
    `${args.layerUrl.replace(/\/$/, "")}/query?${params}`,
  );
  if (json.error) throw new Error(json.error.message ?? "ArcGIS Query Failed");
  const rows = (json.features ?? []).map((f) => f.attributes ?? {});
  return normalizeRows(rows, args.fieldMap, {
    recordType: args.recordType,
    county: args.county,
    state: args.state ?? null,
    provider: `${new URL(args.layerUrl).host} (ArcGIS Feature Service)`,
    casePrefix: "GIS",
  });
}

// ---------------------------------------------------------------------------
// Bulk file ingest — for counties that publish a scheduled CSV (or a ZIP
// containing one) instead of running an API. Same field-map contract as the
// API adapters, so the pipeline treats it identically.
// ---------------------------------------------------------------------------

import { politeFetch } from "./scraper-policy";
import { parseCsv } from "../csv";
import { inferFieldMap, isUsableMap, normalizeRows, type FieldMap } from "./source-mapping";
import type { RawLead } from "./index";

/** CSV text → array of row objects keyed by header. */
export function csvToRecords(text: string, max = 50_000): Array<Record<string, unknown>> {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const headers = table[0]!.map((h) => h.trim());
  return table.slice(1, max + 1).map((row) => {
    const rec: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      rec[h] = row[i] ?? "";
    });
    return rec;
  });
}

export function headersOf(text: string): string[] {
  const table = parseCsv(text);
  return table[0]?.map((h) => h.trim()) ?? [];
}

export function probeCsv(text: string): { columns: string[]; field_map: FieldMap; usable: boolean } {
  const columns = headersOf(text);
  const field_map = inferFieldMap(columns);
  return { columns, field_map, usable: isUsableMap(field_map) };
}

/**
 * Download a published CSV and normalize it. ZIP archives are not unpacked in
 * the worker runtime — those are flagged so a team member drops the extracted
 * CSV in instead.
 */
export async function fetchBulkFileRows(args: {
  fileUrl: string;
  fieldMap: FieldMap;
  recordType: string;
  county: string;
  state?: string | null;
  limit: number;
}): Promise<RawLead[]> {
  if (/\.zip($|\?)/i.test(args.fileUrl)) {
    throw new Error("ZIP Bulk Files Need A Manual Extract Before Ingest");
  }
  const res = await politeFetch(args.fileUrl, { headers: { Accept: "text/csv,*/*" } });
  const text = await res.text();
  const rows = csvToRecords(text, args.limit * 4);
  return normalizeRows(rows, args.fieldMap, {
    recordType: args.recordType,
    county: args.county,
    state: args.state ?? null,
    provider: `${new URL(args.fileUrl).host} (Bulk File)`,
    casePrefix: "BULK",
  }).slice(0, args.limit);
}

// Shared state for a file attached inline on the assistant page. The parsed
// table stays in memory so the column mapper can be re-run without re-reading
// the file, and so the rows land in jobs.params exactly like the Upload page.
import {
  SKIP, autoMapHeaders, mappedCount, parseCsv, rowsFromTable,
  type ColumnMap, type CsvLead,
} from "@/lib/csv";

export type UploadAttachment = {
  file: File;
  name: string;
  size: number;
  /** Raw parsed table (row 0 = headers). Empty for XLSX, parsed server-side. */
  table: string[][];
  headers: string[];
  map: ColumnMap;
  /** True once the mapping is confirmed (auto when the phone column is obvious). */
  mapped: boolean;
  rowCount: number;
  /** CSV parses in the browser; XLSX does not. */
  parseable: boolean;
};

export function isSpreadsheet(file: File): boolean {
  return /\.(csv|xlsx)$/i.test(file.name);
}

export async function readAttachment(file: File): Promise<UploadAttachment> {
  const parseable = /\.csv$/i.test(file.name);
  if (!parseable) {
    return {
      file, name: file.name, size: file.size, table: [], headers: [],
      map: {}, mapped: true, rowCount: 0, parseable: false,
    };
  }
  const table = parseCsv(await file.text());
  const headers = (table[0] ?? []).map((h) => h.trim());
  const map = autoMapHeaders(headers);
  return {
    file, name: file.name, size: file.size, table, headers, map,
    // A recognised phone column is enough to run; anything else is optional.
    mapped: Boolean(map["phone"] && map["phone"] !== SKIP),
    rowCount: Math.max(table.length - 1, 0),
    parseable: true,
  };
}

export function attachmentRows(a: UploadAttachment): CsvLead[] | null {
  if (!a.parseable) return null;
  return rowsFromTable(a.table, a.map);
}

export function attachmentMappedCount(a: UploadAttachment): number {
  return a.parseable ? mappedCount(a.map) : 0;
}

/** Upload jobs are runnable once a file exists and its columns are mapped. */
export function attachmentReady(a: UploadAttachment | null): boolean {
  if (!a) return false;
  if (!a.parseable) return true;
  return a.mapped && attachmentMappedCount(a) > 0;
}

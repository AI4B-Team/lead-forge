/**
 * Browser-side export helpers. One place decides how a row set becomes a file
 * so CSV and Excel downloads always share the same branded filename.
 */
export type ExportFormat = "csv" | "xlsx" | "both";

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(name: string, csv: string) {
  saveBlob(name, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

/** xlsx is heavy — load it only when the user actually picks Excel. */
export async function downloadXlsx(name: string, rows: Array<Record<string, unknown>>, sheetName = "Leads") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  saveBlob(name, new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
}

/** Emits CSV, Excel, or both using the same base name from download-name.ts. */
export async function downloadRows(
  rows: Array<Record<string, unknown>>,
  format: ExportFormat,
  fileName: (ext: string) => string,
  sheetName?: string,
) {
  if (format === "csv" || format === "both") downloadCsv(fileName("csv"), toCsv(rows));
  if (format === "xlsx" || format === "both") await downloadXlsx(fileName("xlsx"), rows, sheetName);
}

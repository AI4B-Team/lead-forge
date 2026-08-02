/**
 * Every export goes through here so that no download can happen without being
 * attributed, capped and watermarked. The server decides (role, monthly row
 * cap, approval threshold) and returns the watermark the file must carry —
 * the client only renders what it was handed.
 */
import { toast } from "sonner";
import { logExport } from "./accountability.functions";
import { watermarkRow } from "./accountability.shared";
import { downloadRows, type ExportFormat } from "./export-file";

export async function guardedExport(opts: {
  workspaceId: string | null | undefined;
  rows: Array<Record<string, unknown>>;
  format: ExportFormat;
  /** Human label for the audit log, e.g. "Clean List · Roofing Q3". */
  scope: string;
  refId?: string | null;
  /** Base name without extension; the watermark suffix is appended to it. */
  fileName: (ext: string) => string;
  sheetName?: string;
}): Promise<boolean> {
  if (!opts.workspaceId) return false;
  if (!opts.rows.length) {
    toast.info("No Rows To Export.");
    return false;
  }
  const fileType = opts.format === "both" ? "csv+xlsx" : opts.format;
  const res = await logExport({
    data: {
      workspaceId: opts.workspaceId,
      scope: opts.scope,
      refId: opts.refId ?? undefined,
      rowCount: opts.rows.length,
      fileType,
    },
  });
  if (!res.allowed) {
    if ("pendingApproval" in res && res.pendingApproval) {
      toast.warning("Approval Requested", { description: res.reason });
    } else {
      toast.error("Export Blocked", { description: res.reason });
    }
    return false;
  }
  // Traceable both ways: in the filename and as a footer row inside the file.
  const rows = [...opts.rows, watermarkRow(opts.rows[0]!, res.watermark)];
  await downloadRows(rows, opts.format, (ext) => stampName(opts.fileName(ext), res.suffix, ext), opts.sheetName);
  return true;
}

/** Inserts the watermark suffix before the extension of an already-built name. */
function stampName(name: string, suffix: string, ext: string) {
  const tail = `.${ext}`;
  const base = name.endsWith(tail) ? name.slice(0, -tail.length) : name;
  return `${base}${suffix}${tail}`;
}

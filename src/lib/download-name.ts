/**
 * Branded download filenames (display layer only — the stored job name never
 * carries the prefix). Pattern:
 *   "LeadTrace – {job name} – {file type}.csv"
 * Every generated file across the app goes through here so downloads group
 * together alphabetically in the user's Downloads folder.
 */
export const BRAND_PREFIX = "LeadTrace";

export type DownloadFileType = "Clean" | "DNC" | "Litigators" | "Scrub Audit" | "All Leads" | "Dataset";

/** Characters invalid in filenames become "-"; en-dashes and commas stay. */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*-\s*-\s*/g, " - ")
    .trim();
}

/** "LeadTrace – Roofer + HVAC – Hillsborough, FL – Aug 1 – Clean.csv" */
export function brandedFileName(jobName: string, fileType: DownloadFileType, ext = "csv"): string {
  return `${sanitizeFileName(`${BRAND_PREFIX} – ${jobName} – ${fileType}`)}.${ext}`;
}

/** Display title on the results/audit page: "LeadTrace – {job name}". */
export function brandedJobTitle(jobName: string): string {
  return `${BRAND_PREFIX} – ${jobName}`;
}

export const BUCKET_FILE_TYPE: Record<"clean" | "dnc" | "litigator" | "all", DownloadFileType> = {
  clean: "Clean",
  dnc: "DNC",
  litigator: "Litigators",
  all: "All Leads",
};

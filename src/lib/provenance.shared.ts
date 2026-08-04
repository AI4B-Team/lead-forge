// Where a record came from. Anything we cannot trace back to a verified source
// (or the customer's own upload) is not contactable, exportable, or visible to
// the AI agent — legacy rows created before coverage verification was live.

export type DataProvenance = "verified_source" | "mock_legacy" | "user_upload" | "unknown";

export const TRUSTED_PROVENANCE: DataProvenance[] = ["verified_source", "user_upload"];

export function isTrustedProvenance(value: string | null | undefined): boolean {
  return TRUSTED_PROVENANCE.includes((value ?? "unknown") as DataProvenance);
}

export const UNTRUSTED_LIST_MESSAGE =
  "This list contains records created before source verification was live and cannot be contacted. Re-run the search to get verified records.";

export const UNTRUSTED_LEAD_MESSAGE =
  "These records predate source verification and cannot be used for outreach or export.";

export const PROVENANCE_LABEL: Record<DataProvenance, string> = {
  verified_source: "Verified Source",
  user_upload: "Your Upload",
  mock_legacy: "Unverified Legacy",
  unknown: "Unknown Origin",
};
/**
 * Record types the pipeline can actually fulfill today. Adding a new wedge
 * (permits, business registrations, licenses) means adding a row here — the
 * List Settings dropdown renders straight off this config.
 */
export type RecordTypeCategory = "real_estate_distress" | "permits" | "business_registration" | "licensing";

export type RecordTypeOption = {
  id: string;
  label: string;
  category: RecordTypeCategory;
};

export const RECORD_TYPE_OPTIONS: readonly RecordTypeOption[] = [
  { id: "probate", label: "Probate", category: "real_estate_distress" },
  { id: "code_violation", label: "Code Violation", category: "real_estate_distress" },
  { id: "pre_foreclosure", label: "Pre-Foreclosure / Lis Pendens", category: "real_estate_distress" },
  { id: "tax_default", label: "Tax Default / Delinquency", category: "real_estate_distress" },
  { id: "vacancy", label: "Vacancy / Demolition Notice", category: "real_estate_distress" },
  { id: "eviction", label: "Eviction", category: "real_estate_distress" },
];

/** Labels only, for prompts and legacy call sites that key off the label. */
export const RECORD_TYPE_LABELS: readonly string[] = RECORD_TYPE_OPTIONS.map((r) => r.label);

/** Sentinel value used by the dropdown's "Request A Record Type…" affordance. */
export const REQUEST_RECORD_TYPE = "__request_record_type__";
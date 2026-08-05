/**
 * Record types the pipeline can actually fulfill today. Adding a new wedge
 * (permits, business registrations, licenses) means adding a row here — the
 * List Builder dropdown renders straight off this config.
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

/**
 * The source template that actually serves each record type. The Source row and
 * the Record Type row describe the SAME job, so changing one must move the
 * other — otherwise the spec reads as two different jobs.
 */
const TEMPLATE_BY_RECORD_TYPE: Record<string, string> = {
  Probate: "probate",
  "Code Violation": "code",
  "Pre-Foreclosure / Lis Pendens": "prefc",
  "Tax Default / Delinquency": "tax",
  "Vacancy / Demolition Notice": "vacancy",
};

export function templateForRecordType(label: string | null | undefined): string | null {
  return (label && TEMPLATE_BY_RECORD_TYPE[label]) || null;
}
/**
 * The record type a public-records template pulls. Template cards are gated on
 * verified coverage for this label, so a filing with no verified county
 * anywhere renders as "Coming Soon" instead of a runnable free template.
 */
export function recordTypeForTemplate(templateId: string | null | undefined): string | null {
  if (!templateId) return null;
  const hit = Object.entries(TEMPLATE_BY_RECORD_TYPE).find(([, id]) => id === templateId);
  return hit ? hit[0] : null;
}

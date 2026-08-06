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
  const canonical = canonicalRecordType(label);
  return (canonical && TEMPLATE_BY_RECORD_TYPE[canonical]) || null;
}

/**
 * One canonical spelling for a record type: the option LABEL.
 *
 * The model, the seed data and older specs all write this field differently
 * ("code_violation", "Code Violations", "lis pendens"). The panel's dropdown
 * keys off the label, so an id-shaped value rendered as an EMPTY select while
 * the List Assembled card happily displayed it — two controls reading the same
 * spec and disagreeing. Canonicalising at the spec boundary removes the class
 * of bug rather than patching one control.
 */
function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const RECORD_TYPE_ALIASES: Record<string, string> = {
  probates: "Probate",
  probatelead: "Probate",
  codeviolations: "Code Violation",
  codeenforcement: "Code Violation",
  codecase: "Code Violation",
  preforeclosure: "Pre-Foreclosure / Lis Pendens",
  preforeclosures: "Pre-Foreclosure / Lis Pendens",
  lispendens: "Pre-Foreclosure / Lis Pendens",
  foreclosure: "Pre-Foreclosure / Lis Pendens",
  taxdelinquent: "Tax Default / Delinquency",
  taxdelinquency: "Tax Default / Delinquency",
  taxdefault: "Tax Default / Delinquency",
  taxdeed: "Tax Default / Delinquency",
  vacancy: "Vacancy / Demolition Notice",
  vacant: "Vacancy / Demolition Notice",
  demolition: "Vacancy / Demolition Notice",
  evictions: "Eviction",
};

export function canonicalRecordType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const k = key(raw);
  if (!k) return null;
  const hit = RECORD_TYPE_OPTIONS.find((r) => key(r.id) === k || key(r.label) === k);
  if (hit) return hit.label;
  return RECORD_TYPE_ALIASES[k] ?? null;
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

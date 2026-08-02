// ---------------------------------------------------------------------------
// Per-template field schemas + honest adapter availability.
//
// The List Builder panel renders from these schemas instead of a hardcoded
// business/records/upload form: Zillow wants geography + listing filters,
// LinkedIn wants a keyword + audience size, Contact Details wants a URL.
// Slot gating and the assembling checklist read the SAME schema, so
// "waiting on you" always matches the fields that template actually needs.
// ---------------------------------------------------------------------------

import { templateSourceType, type Template, type TemplateCategory } from "@/lib/templates";
import type { JobSpec } from "@/lib/assistant.shared";

/** Every field the builder knows how to render. */
export type BuilderField =
  | "niche"
  | "keyword"
  | "recordType"
  | "state"
  | "counties"
  | "recency"
  | "url"
  | "audienceFilter"
  | "listingFilter"
  | "upload";

export type AdapterStatus = "live" | "beta" | "requested";

/** Site scrapers take a URL, not a geography. */
const URL_TEMPLATES = new Set(["contact-details", "universal-crawl", "web-scraper", "site-crawler"]);

const BY_CATEGORY: Record<TemplateCategory, BuilderField[]> = {
  upload: ["upload"],
  records: ["recordType", "state", "counties", "recency"],
  business: ["niche", "state", "counties"],
  directories: ["niche", "state", "counties"],
  search: ["keyword", "state", "counties"],
  reviews: ["niche", "state", "counties"],
  realestate: ["state", "counties", "listingFilter"],
  social: ["keyword", "audienceFilter"],
  ecommerce: ["keyword"],
  jobs: ["keyword", "state"],
  travel: ["keyword", "state"],
  finance: ["keyword", "state"],
  education: ["keyword", "state"],
  news: ["keyword"],
  sports: ["keyword"],
};

/** Adapters wired to the real pipeline today. */
const LIVE_CATEGORIES = new Set<TemplateCategory>(["business", "records", "upload"]);

export function templateAdapterStatus(t: Template): AdapterStatus {
  if (t.adapterStatus) return t.adapterStatus;
  if (LIVE_CATEGORIES.has(t.category)) return "live";
  return "beta";
}

export function templateFieldSchema(t: Template): BuilderField[] {
  if (t.fieldSchema?.length) return t.fieldSchema as BuilderField[];
  if (URL_TEMPLATES.has(t.id)) return ["url"];
  return BY_CATEGORY[t.category] ?? ["keyword", "state", "counties"];
}

/** Fields for a spec with no template selected (the ?source= panel path). */
export function fieldsForSourceType(source: JobSpec["sourceType"]): BuilderField[] {
  if (source === "upload") return BY_CATEGORY.upload;
  if (source === "records") return BY_CATEGORY.records;
  if (source === "business") return BY_CATEGORY.business;
  return [];
}

/** The schema in force: template first, otherwise the raw source type. */
export function fieldsForSpec(spec: JobSpec, template?: Template | null): BuilderField[] {
  if (template) return templateFieldSchema(template);
  return fieldsForSourceType(spec.sourceType);
}

/** Optional fields never block Generate List. */
const OPTIONAL: BuilderField[] = ["recency", "audienceFilter", "listingFilter"];

export function isOptionalField(f: BuilderField): boolean {
  return OPTIONAL.includes(f);
}

export const FIELD_SLOT_LABEL: Record<BuilderField, string> = {
  niche: "Niche",
  keyword: "Keyword",
  recordType: "Record Type",
  state: "Location",
  counties: "Location",
  recency: "Recency",
  url: "URL",
  audienceFilter: "Audience Filter",
  listingFilter: "Listing Filter",
  upload: "File",
};

/** True when the spec already satisfies a given field. */
export function fieldFilled(f: BuilderField, spec: JobSpec, uploadReady: boolean): boolean {
  switch (f) {
    case "upload":
      return uploadReady;
    case "niche":
    case "keyword":
      return spec.niches.length > 0;
    case "recordType":
      return Boolean(spec.recordType);
    case "state":
    case "counties":
      return (spec.states.length > 0 || Boolean(spec.state)) || spec.counties.length > 0;
    case "url":
      return Boolean(spec.targetUrl && /\./.test(spec.targetUrl));
    default:
      return true;
  }
}

/** Adapter status for whatever is currently selected in the builder. */
export function specAdapterStatus(spec: JobSpec, template?: Template | null): AdapterStatus {
  if (template) return templateAdapterStatus(template);
  // No template: only the three wired source types can be chosen at all.
  return spec.sourceType ? "live" : "live";
}

/** A template can only reach the pipeline when its own source type is wired. */
export function templateRunnableSourceType(t: Template) {
  return templateSourceType(t);
}

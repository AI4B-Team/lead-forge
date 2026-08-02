// A file dropped into the assistant can mean three different things. The shape
// of the file tells us which one is likely; the user always confirms.
import type { UploadAttachment } from "@/lib/upload-attachment";

export type UploadIntent = "import" | "enrich" | "targets" | "suppression";

/** What a single-column parameter file contains, when that's the intent. */
export type TargetKind = "keywords" | "areas" | "urls";

export const INTENT_LABEL: Record<UploadIntent, string> = {
  import: "Import & Clean This List",
  enrich: "Enrich (Fill Missing Phones/Emails + Scrub)",
  targets: "Scrape Targets (Keywords/ZIPs/URLs)",
  suppression: "Suppression List To Exclude",
};

export const INTENT_HINT: Record<UploadIntent, string> = {
  import: "Runs the full pipeline: dedupe, verify, trace, and scrub your rows.",
  enrich: "Same pipeline, aimed at gaps — fills missing phones and emails, then re-scrubs against DNC and litigator lists.",
  targets: "The file configures the run instead of becoming leads — we scrape your current source once per value.",
  suppression: "Saved to your workspace. Anyone matching this file is filtered out of this and every future run.",
};

export const TARGET_KIND_LABEL: Record<TargetKind, string> = {
  keywords: "Keywords / Niches",
  areas: "ZIPs / Cities",
  urls: "URLs / Domains",
};

const CONTACT_HEADERS = /(phone|mobile|cell|email|address|street|first|last|name|company|business|zip|postal|city|state)/i;
const PHONE_HEADERS = /(phone|mobile|cell)/i;
const EMAIL_HEADERS = /email/i;
const URL_HEADERS = /(url|website|domain|site|link)/i;
const AREA_HEADERS = /(zip|postal|city|area|county|metro|market)/i;
const KEYWORD_HEADERS = /(keyword|niche|trade|category|industry|query|search|term)/i;
const BRAND_HEADERS = /(script|faq|answer|question|policy|objection|training|knowledge|about)/i;

function nonEmptyColumns(table: string[][]): number {
  const width = Math.max(0, ...table.slice(0, 25).map((r) => r.filter((c) => c.trim()).length));
  return width;
}

function sampleValues(a: UploadAttachment, col = 0): string[] {
  return a.table.slice(1, 25).map((r) => (r[col] ?? "").trim()).filter(Boolean);
}

export function looksLikeUrls(values: string[]): boolean {
  if (!values.length) return false;
  const hits = values.filter((v) => /^(https?:\/\/|www\.)/i.test(v) || /^[\w-]+\.[a-z]{2,}(\/|$)/i.test(v));
  return hits.length / values.length > 0.6;
}

function looksLikeAreas(values: string[]): boolean {
  if (!values.length) return false;
  const hits = values.filter((v) => /^\d{5}(-\d{4})?$/.test(v) || /^[A-Za-z .'-]+,\s?[A-Z]{2}$/.test(v));
  return hits.length / values.length > 0.6;
}

export type IntentDetection = {
  /** Pre-selected option in the chooser. */
  inferred: UploadIntent;
  /** Kind of parameter file, when the inference is `targets`. */
  targetKind: TargetKind;
  /** Values a `targets` file would fan the scrape out across. */
  targetValues: string[];
  /** True when the columns read like sales scripts / FAQs, not lead data. */
  brandLike: boolean;
  /** One-line description of what we saw in the file. */
  summary: string;
};

/**
 * Infer intent from column shape: contact-ish columns mean leads, a single
 * column of values means scrape parameters.
 */
export function detectUploadIntent(a: UploadAttachment): IntentDetection {
  const headers = a.headers.map((h) => h.trim()).filter(Boolean);
  const headerText = headers.join(" ");
  const width = a.parseable ? nonEmptyColumns(a.table) : 2;
  const values = a.parseable ? sampleValues(a) : [];

  const brandLike = a.parseable && headers.length > 0 && BRAND_HEADERS.test(headerText) && !CONTACT_HEADERS.test(headerText);

  // Single column (or clearly URL-shaped) → parameters, not leads.
  const urlish = URL_HEADERS.test(headerText) || looksLikeUrls(values);
  const areaish = AREA_HEADERS.test(headerText) || looksLikeAreas(values);
  const keywordish = KEYWORD_HEADERS.test(headerText);
  const singleColumn = a.parseable && width <= 1;

  if (a.parseable && (singleColumn || (urlish && width <= 2))) {
    const targetKind: TargetKind = urlish ? "urls" : areaish ? "areas" : "keywords";
    return {
      inferred: "targets",
      targetKind,
      targetValues: values,
      brandLike,
      summary: `${values.length.toLocaleString()} ${TARGET_KIND_LABEL[targetKind]} In One Column`,
    };
  }

  // Contact-shaped: import when phones are present, enrich when they're missing.
  const hasPhone = PHONE_HEADERS.test(headerText);
  const hasEmail = EMAIL_HEADERS.test(headerText);
  const inferred: UploadIntent = a.parseable && !hasPhone && !hasEmail ? "enrich" : "import";
  return {
    inferred,
    targetKind: keywordish ? "keywords" : areaish ? "areas" : "keywords",
    targetValues: values,
    brandLike,
    summary: a.parseable
      ? `${a.rowCount.toLocaleString()} Rows · ${headers.length} Columns${hasPhone ? " · Phone Column Found" : " · No Phone Column"}`
      : "Excel File — Columns Read After Upload",
  };
}

/** Every value a parameter file fans the scrape out across (first column). */
export function targetValuesFrom(a: UploadAttachment): string[] {
  const rows = a.table.slice(1).map((r) => (r[0] ?? "").trim()).filter(Boolean);
  return Array.from(new Set(rows)).slice(0, 500);
}

/** Phones and emails to suppress, pulled from any column that looks right. */
export function suppressionKeysFrom(a: UploadAttachment): { phones: string[]; emails: string[] } {
  const phones = new Set<string>();
  const emails = new Set<string>();
  for (const row of a.table.slice(1)) {
    for (const cell of row) {
      const v = (cell ?? "").trim();
      if (!v) continue;
      if (v.includes("@")) { emails.add(v.toLowerCase()); continue; }
      const d = v.replace(/\D/g, "");
      if (d.length >= 10) phones.add(d.slice(-10));
    }
  }
  return { phones: Array.from(phones).slice(0, 20000), emails: Array.from(emails).slice(0, 20000) };
}
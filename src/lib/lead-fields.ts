// ---------------------------------------------------------------------------
// One field registry for every lead table.
//
// Two tables read from it, keyed off different things on purpose:
//   - a single run's results page is SCHEMA-driven (one run = one output shape,
//     so the template decides which columns exist), and
//   - the Leads aggregate is DATA-driven (a deduplicated contact spans many
//     lists with different shapes, so columns follow what's actually present
//     in the current filtered view).
//
// Reachability stays limited to the three channels we can lawfully contact:
// phone/SMS, email, mailing address. Website and social handles are display /
// enrichment fields — they never earn a "reachable by" count or a campaign
// channel, because you can't contact a URL.
// ---------------------------------------------------------------------------

import { enrichmentProfile, type EnrichmentProfile } from "@/lib/pipeline-options";

export type LeadFieldKind = "outreach" | "display";

export type LeadFieldKey =
  | "name"
  | "business"
  | "handle"
  | "platform"
  | "followers"
  | "engagement"
  | "location"
  | "phone"
  | "email"
  | "address"
  | "website";

export type LeadFieldRow = Record<string, unknown> & {
  source_meta?: unknown;
};

export type LeadField = {
  key: LeadFieldKey;
  label: string;
  kind: LeadFieldKind;
  /** Raw display value for this row, or null when the record has none. */
  value: (row: LeadFieldRow) => string | null;
};

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const meta = (row: LeadFieldRow): Record<string, unknown> =>
  row.source_meta && typeof row.source_meta === "object" ? (row.source_meta as Record<string, unknown>) : {};

const socials = (row: LeadFieldRow): Record<string, unknown> =>
  row.socials && typeof row.socials === "object" ? (row.socials as Record<string, unknown>) : {};

const firstOf = (...vals: unknown[]): string | null => {
  for (const v of vals) {
    const s = str(v);
    if (s) return s;
  }
  return null;
};

/** Every field the app knows how to show, defined exactly once. */
export const LEAD_FIELDS: Record<LeadFieldKey, LeadField> = {
  name: { key: "name", label: "Name", kind: "display", value: (r) => str(r.full_name) },
  business: { key: "business", label: "Business", kind: "display", value: (r) => str(r.business_name) },
  handle: {
    key: "handle",
    label: "Handle",
    kind: "display",
    // Identity, not a fallback for a name: if a run yielded no handle the
    // column has to stay absent, or every business row would fake one.
    value: (r) =>
      firstOf(r.handle, meta(r).handle, meta(r).username, socials(r).instagram, socials(r).tiktok),
  },
  platform: {
    key: "platform",
    label: "Platform",
    kind: "display",
    value: (r) => firstOf(r.platform, meta(r).platform),
  },
  followers: {
    key: "followers",
    label: "Followers",
    kind: "display",
    value: (r) => firstOf(r.followers, meta(r).followers, meta(r).follower_count),
  },
  engagement: {
    key: "engagement",
    label: "Engagement",
    kind: "display",
    value: (r) => firstOf(r.engagement, meta(r).engagement, meta(r).engagement_rate),
  },
  location: {
    key: "location",
    label: "Location",
    kind: "display",
    value: (r) => [str(r.city), str(r.state)].filter(Boolean).join(", ") || null,
  },
  phone: { key: "phone", label: "Phone", kind: "outreach", value: (r) => str(r.phone) },
  email: { key: "email", label: "Email", kind: "outreach", value: (r) => firstOf(r.email, meta(r).email) },
  address: { key: "address", label: "Address", kind: "outreach", value: (r) => str(r.address) },
  website: {
    key: "website",
    label: "Website",
    kind: "display",
    value: (r) => firstOf(r.website, meta(r).website, meta(r).profile_url, meta(r).url),
  },
};

/** The three real outreach channels. Website/social are deliberately absent. */
export const OUTREACH_FIELD_KEYS: LeadFieldKey[] = ["phone", "email", "address"];

/** Output shape per enrichment profile — a run yields exactly these fields. */
const FIELDS_BY_PROFILE: Record<EnrichmentProfile, LeadFieldKey[]> = {
  creator: ["handle", "platform", "followers", "engagement", "email", "website"],
  seller: ["business", "website", "email"],
  b2b: ["name", "business", "email", "phone"],
  portal: ["name", "address", "phone", "email"],
  data: ["business", "website", "location"],
  standard: ["name", "business", "location", "phone", "email", "address"],
};

/**
 * Candidate columns for the aggregate Leads table, in display order. Every
 * profile-specific field is a candidate; presence in the current filtered view
 * decides which ones actually render.
 */
export const AGGREGATE_CANDIDATE_KEYS: LeadFieldKey[] = [
  "handle",
  "platform",
  "followers",
  "engagement",
  "phone",
  "email",
  "address",
  "website",
];

/** Site scrapers take a URL in and hand back a business + its contact page. */
const URL_SCRAPER_IDS = new Set(["contact-details", "universal-crawl", "web-scraper", "site-crawler"]);

const FIELDS_BY_TEMPLATE: Record<string, LeadFieldKey[]> = {
  probate: ["name", "address", "phone"],
  "google-maps": ["business", "location", "phone", "website", "email"],
  yelp: ["business", "location", "phone", "website", "email"],
};

/** Columns a given run's results table should render, from its template. */
export function resultFieldsForTemplate(templateId?: string | null): LeadField[] {
  const keys = templateId && FIELDS_BY_TEMPLATE[templateId]
    ? FIELDS_BY_TEMPLATE[templateId]
    : templateId && URL_SCRAPER_IDS.has(templateId)
      ? (["business", "website", "email"] as LeadFieldKey[])
      : FIELDS_BY_PROFILE[enrichmentProfile(templateId)];
  return keys.map((k) => LEAD_FIELDS[k]);
}

/** Keep only the schema fields this run actually populated. */
export function populatedFields(fields: LeadField[], rows: LeadFieldRow[]): LeadField[] {
  if (rows.length === 0) return fields;
  return fields.filter((f) => rows.some((r) => f.value(r) !== null));
}

/**
 * Data-driven columns for the deduplicated Leads master: the union of fields
 * present anywhere in the current filtered view, so a narrowed filter never
 * leaves a wall of dashes.
 */
export function presentFieldKeys(rows: LeadFieldRow[], candidates: LeadFieldKey[]): Set<LeadFieldKey> {
  const present = new Set<LeadFieldKey>();
  for (const key of candidates) {
    const field = LEAD_FIELDS[key];
    if (rows.some((r) => field.value(r) !== null)) present.add(key);
  }
  return present;
}
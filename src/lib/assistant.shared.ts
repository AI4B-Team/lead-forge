import { z } from "zod";
import { buyBoxSchema, DEFAULT_MATCH_THRESHOLD } from "./property-scan.shared";

/**
 * The Job Spec the assistant assembles. It maps 1:1 onto the existing
 * `jobs.params` shape so "Review & Run" just creates a jobs row.
 */
export const jobSpecSchema = z.object({
  sourceType: z.enum(["business", "records", "upload", "property_scan"]).nullable().default(null),
  name: z.string().max(120).nullable().default(null),
  niches: z.array(z.string().max(60)).max(20).default([]),
  recordType: z.string().max(80).nullable().default(null),
  state: z.string().max(2).nullable().default(null),
  /** Multiple states can be worked at once; `state` mirrors the first one. */
  states: z.array(z.string().length(2)).max(10).default([]),
  counties: z.array(z.string().max(80)).max(20).default([]),
  /** City-shaped geography (Apartments, Foursquare, travel sources). */
  city: z.string().max(80).nullable().default(null),
  /** Country for non-US portals and marketplaces. */
  country: z.string().max(60).nullable().default(null),
  /** US real-estate portals: whose contact details the run targets. */
  contactTarget: z.enum(["agents", "fsbo"]).nullable().default(null),
  recencyDays: z.number().int().min(1).max(3650).nullable().default(null),
  /** Per-search cap. Total rows ≈ maxResults × niches × counties. */
  maxResults: z.number().int().min(1).max(50000).nullable().default(500),
  /** Opt-in only: business sources start with franchises included. */
  removeFranchises: z.boolean().default(false),
  dedupe: z.boolean().default(true),
  mobileOnly: z.boolean().default(true),
  skipTrace: z.boolean().default(true),
  /**
   * Creator sources only: keep only creators who publish a contact email.
   * Creator outreach runs on email/DM, never on skip-traced cell numbers.
   */
  emailRequired: z.boolean().default(true),
  industry: z.string().max(40).nullable().default(null),
  messageAngle: z.string().max(400).nullable().default(null),
  templateId: z.string().max(60).nullable().default(null),
  /** Site-scraper templates (Contact Details, Universal Crawl) target a URL. */
  targetUrl: z.string().max(300).nullable().default(null),
  /**
   * How the finished list gets worked. Inferred from the source; the List
   * Builder can override it. SMS is the only channel LeadTrace sends on.
   */
  channel: z.enum(["sms", "email", "direct_mail"]).nullable().default(null),
  /** Free-text filter a template's schema exposes (followers, listing status). */
  filters: z.string().max(200).nullable().default(null),
  /**
   * Why an uploaded file is here: "import" runs it as leads, "enrich" is the
   * same pipeline framed as gap-filling. Null for scraped sources.
   */
  uploadIntent: z.enum(["import", "enrich"]).nullable().default(null),
  /** Parameter file: the scrape fans out once per value instead of using it as leads. */
  scrapeTargets: z.array(z.string().max(120)).max(500).default([]),
  scrapeTargetKind: z.enum(["keywords", "areas", "urls"]).nullable().default(null),
  /** Workspace suppression file applied to this run (informational). */
  suppressionFile: z.string().max(160).nullable().default(null),
  // ---- Property Scan (AI Driving For Dollars) ----
  /**
   * Plain-language condition criteria the imagery model scores against. The
   * assistant infers these from the operator's prompt; the rail edits them the
   * same way Niches are edited. There is no second prompt box.
   */
  visualCriteria: z.array(z.string().max(160)).max(12).default([]),
  /** The data filter that runs BEFORE any imagery is bought. */
  buyBox: buyBoxSchema.nullable().default(null),
  /** Minimum match score a scored property needs to make the list. */
  matchThreshold: z.number().int().min(50).max(100).nullable().default(DEFAULT_MATCH_THRESHOLD),
  /** Images bought per property. Three angles cost more and score better. */
  imagesPer: z.union([z.literal(1), z.literal(3)]).default(3),
});

export type JobSpec = z.infer<typeof jobSpecSchema>;

/** Every state the spec covers, tolerating older single-state specs. */
export function specStates(spec: JobSpec): string[] {
  if (spec.states.length) return spec.states;
  return spec.state ? [spec.state] : [];
}

/** Keep `states` and the legacy `state` field in sync on every edit. */
export function withStates(spec: JobSpec, states: string[]): JobSpec {
  const next = states.map((s) => s.toUpperCase());
  return { ...spec, states: next, state: next[0] ?? null };
}

export const EMPTY_SPEC: JobSpec = jobSpecSchema.parse({});

export type Coverage = "live" | "beta" | "requested" | "unknown";

export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type AssistantReply = {
  reply: string;
  spec: JobSpec;
  /** Coverage verdict per requested county, validated server-side. */
  coverage: Array<{ county: string; coverage: Coverage }>;
  suggestedTemplates: string[];
  estimate: { rows: number; skipTraceCredits: number; scrapeCredits: number } | null;
  refused?: boolean;
};

/** Human summary of a spec, used in the review header and the audit trail. */
export function describeSpec(spec: JobSpec): string {
  if (!spec.sourceType) return "No Source Chosen Yet";
  if (spec.sourceType === "upload") return "Upload Your Own List";
  const geo =
    spec.counties.join(", ") ||
    spec.city ||
    specStates(spec).join(", ") ||
    spec.country ||
    "No Geography";
  if (spec.sourceType === "property_scan") {
    return ["Property Scan", geo].join(" · ");
  }
  if (spec.sourceType === "records") {
    return [spec.recordType ?? "Public Records", geo]
      .join(" · ");
  }
  return [spec.niches.join(", ") || "No Niche", geo]
    .join(" · ");
}
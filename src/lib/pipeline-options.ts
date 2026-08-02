import type { JobSpec } from "@/lib/assistant.shared";

/** Which source kinds a toggle applies to. */
export type SourceKind = NonNullable<JobSpec["sourceType"]>;

/**
 * Enrichment profiles. Phone enrichment is not universal:
 * - creator: TikTok / Instagram / YouTube style sources. The deliverable is
 *   email + profile + engagement. Creator outreach runs on email and DMs, and
 *   cold-texting individuals is a TCPA consent problem we don't take on, so
 *   skip trace and mobile filtering are hidden entirely here.
 * - b2b: LinkedIn style prospecting, where a decision-maker's direct dial is
 *   legitimately valuable. Skip trace stays visible, but defaults OFF.
 * - standard: business + public records + uploads. Phones are the product.
 */
export type EnrichmentProfile = "creator" | "b2b" | "standard";

/** Creator templates (including hashtag/search variants). */
export const CREATOR_TEMPLATE_IDS: readonly string[] = [
  "tiktok",
  "tiktok-hashtag",
  "instagram",
  "instagram-hashtag",
  "youtube",
  "youtube-search",
  "pinterest",
];

/** B2B prospecting templates where direct dials matter. */
export const B2B_TEMPLATE_IDS: readonly string[] = ["linkedin"];

export function enrichmentProfile(templateId?: string | null): EnrichmentProfile {
  if (!templateId) return "standard";
  if (CREATOR_TEMPLATE_IDS.includes(templateId)) return "creator";
  if (B2B_TEMPLATE_IDS.includes(templateId)) return "b2b";
  return "standard";
}

export function isCreatorSource(templateId?: string | null): boolean {
  return enrichmentProfile(templateId) === "creator";
}

export type PipelineOption = {
  id: "skipTrace" | "removeFranchises" | "dedupe" | "mobileOnly" | "emailRequired";
  label: string;
  /** Plain-language explanation surfaced by the "?" hint in the List Builder. */
  hint: string;
  defaultOn: boolean;
  sourceKinds: readonly SourceKind[];
  /** Which enrichment profiles show this toggle at all. */
  profiles: readonly EnrichmentProfile[];
  /** Shorter label used by the Assembling checklist when it differs. */
  checklistLabel?: string;
  /** Per-profile overrides for wording and default state. */
  overrides?: Partial<Record<EnrichmentProfile, Partial<Pick<PipelineOption, "label" | "hint" | "defaultOn">>>>;
};

/**
 * Single source of truth for the four pipeline toggles. The List Builder
 * panel, the assembly checklist, the "You Edited" chips, and any toast all
 * read their wording from here, so the panel and the checklist can be
 * compared word-for-word, top to bottom.
 *
 * Order matters: the checklist renders enabled toggles in this exact order.
 */
export const PIPELINE_OPTIONS: readonly PipelineOption[] = [
  {
    id: "skipTrace",
    label: "Skip Trace Missing Numbers",
    hint: "When a record has no phone number, we look one up from public and licensed data. Skip trace is metered separately from your plan allowance.",
    defaultOn: true,
    sourceKinds: ["business", "records", "upload"],
    profiles: ["standard", "b2b"],
    overrides: {
      b2b: {
        defaultOn: false,
        hint: "Find direct dials for decision-makers (uses skip-trace credits).",
      },
    },
  },
  {
    id: "emailRequired",
    label: "Only Creators With Contact Email",
    checklistLabel: "Email Required",
    hint: "Keeps only creators who publish a contact email, since creator outreach runs on email and DMs. We never text creators' personal cell phones.",
    defaultOn: true,
    sourceKinds: ["business", "records", "upload"],
    profiles: ["creator"],
  },
  {
    id: "removeFranchises",
    label: "Remove Franchises",
    hint: "Filters out national chains and franchise locations so you're left with independent, owner-operated businesses.",
    defaultOn: false,
    sourceKinds: ["business"],
    profiles: ["standard"],
  },
  {
    id: "dedupe",
    label: "Dedupe Against Past Lists",
    hint: "Removes anyone already in your Leads library, so you never pay for or text the same person twice.",
    defaultOn: true,
    sourceKinds: ["business", "records", "upload"],
    profiles: ["creator", "b2b", "standard"],
  },
  {
    id: "mobileOnly",
    label: "Mobile Numbers Only",
    hint: "Runs a line-type check and keeps only mobile numbers — landlines and VoIP can't receive texts reliably.",
    defaultOn: true,
    sourceKinds: ["business", "records", "upload"],
    profiles: ["standard", "b2b"],
  },
];

export type PipelineOptionId = PipelineOption["id"];

export const PIPELINE_OPTION_LABELS: Record<PipelineOptionId, string> = PIPELINE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o.label }),
  {} as Record<PipelineOptionId, string>,
);

/** Apply a profile's wording/default overrides to an option. */
function resolve(option: PipelineOption, profile: EnrichmentProfile): PipelineOption {
  const o = option.overrides?.[profile];
  return o ? { ...option, ...o } : option;
}

/**
 * Toggles that should render, in canonical order. Visibility is both
 * source-kind aware and enrichment-profile aware: creator sources never see
 * skip trace or mobile filtering, and see the email requirement instead.
 */
export function optionsForSource(
  sourceType: JobSpec["sourceType"],
  templateId?: string | null,
): readonly PipelineOption[] {
  const profile = enrichmentProfile(templateId);
  const inProfile = PIPELINE_OPTIONS.filter((o) => o.profiles.includes(profile));
  const scoped = sourceType
    ? inProfile.filter((o) => o.sourceKinds.includes(sourceType))
    : inProfile.filter((o) => resolve(o, profile).defaultOn);
  return scoped.map((o) => resolve(o, profile));
}

/**
 * Enabled toggles for the checklist. Default-off toggles only appear when the
 * user (or the assistant) actually turned them on.
 */
export function enabledOptions(spec: JobSpec): readonly PipelineOption[] {
  return optionsForSource(spec.sourceType, spec.templateId).filter((o) => spec[o.id]);
}

/**
 * Snap a spec's toggles onto the defaults of the selected source's profile.
 * Called whenever a template is picked so a creator source never carries a
 * stale skipTrace/mobileOnly true, and LinkedIn starts with skip trace off.
 */
export function withEnrichmentDefaults(spec: JobSpec, templateId?: string | null): JobSpec {
  const profile = enrichmentProfile(templateId ?? spec.templateId);
  const next = { ...spec };
  for (const option of PIPELINE_OPTIONS) {
    const visible = option.profiles.includes(profile);
    next[option.id] = visible ? resolve(option, profile).defaultOn : false;
  }
  return next;
}

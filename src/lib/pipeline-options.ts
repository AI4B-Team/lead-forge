import type { JobSpec } from "@/lib/assistant.shared";

/** Which source kinds a toggle applies to. */
export type SourceKind = NonNullable<JobSpec["sourceType"]>;

export type PipelineOption = {
  id: "skipTrace" | "removeFranchises" | "dedupe" | "mobileOnly";
  label: string;
  /** Plain-language explanation surfaced by the "?" hint in the List Builder. */
  hint: string;
  defaultOn: boolean;
  sourceKinds: readonly SourceKind[];
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
  },
  {
    id: "removeFranchises",
    label: "Remove Franchises",
    hint: "Filters out national chains and franchise locations so you're left with independent, owner-operated businesses.",
    defaultOn: false,
    sourceKinds: ["business"],
  },
  {
    id: "dedupe",
    label: "Dedupe Against Past Lists",
    hint: "Removes anyone already in your Leads library, so you never pay for or text the same person twice.",
    defaultOn: true,
    sourceKinds: ["business", "records", "upload"],
  },
  {
    id: "mobileOnly",
    label: "Mobile Numbers Only",
    hint: "Runs a line-type check and keeps only mobile numbers — landlines and VoIP can't receive texts reliably.",
    defaultOn: true,
    sourceKinds: ["business", "records", "upload"],
  },
];

export type PipelineOptionId = PipelineOption["id"];

export const PIPELINE_OPTION_LABELS: Record<PipelineOptionId, string> = PIPELINE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o.label }),
  {} as Record<PipelineOptionId, string>,
);

/** Toggles that should render for a given source kind, in canonical order. */
export function optionsForSource(sourceType: JobSpec["sourceType"]): readonly PipelineOption[] {
  if (!sourceType) return PIPELINE_OPTIONS.filter((o) => o.defaultOn);
  return PIPELINE_OPTIONS.filter((o) => o.sourceKinds.includes(sourceType));
}

/**
 * Enabled toggles for the checklist. Default-off toggles only appear when the
 * user (or the assistant) actually turned them on.
 */
export function enabledOptions(spec: JobSpec): readonly PipelineOption[] {
  return optionsForSource(spec.sourceType).filter((o) => spec[o.id]);
}

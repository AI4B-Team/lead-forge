import { z } from "zod";

/**
 * The Job Spec the assistant assembles. It maps 1:1 onto the existing
 * `jobs.params` shape so "Review & Run" just creates a jobs row.
 */
export const jobSpecSchema = z.object({
  sourceType: z.enum(["business", "records", "upload"]).nullable().default(null),
  name: z.string().max(120).nullable().default(null),
  niches: z.array(z.string().max(60)).max(20).default([]),
  recordType: z.string().max(80).nullable().default(null),
  state: z.string().max(2).nullable().default(null),
  counties: z.array(z.string().max(80)).max(20).default([]),
  recencyDays: z.number().int().min(1).max(3650).nullable().default(null),
  removeFranchises: z.boolean().default(true),
  dedupe: z.boolean().default(true),
  mobileOnly: z.boolean().default(true),
  skipTrace: z.boolean().default(true),
  industry: z.string().max(40).nullable().default(null),
  messageAngle: z.string().max(400).nullable().default(null),
  templateId: z.string().max(60).nullable().default(null),
});

export type JobSpec = z.infer<typeof jobSpecSchema>;

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
  if (spec.sourceType === "records") {
    return [spec.recordType ?? "Public Records", spec.counties.join(", ") || spec.state || "No Geography"]
      .join(" · ");
  }
  return [spec.niches.join(", ") || "No Niche", spec.counties.join(", ") || spec.state || "No Geography"]
    .join(" · ");
}
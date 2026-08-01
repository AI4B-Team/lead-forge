import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jobSpecSchema } from "@/lib/assistant.shared";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

/** One assistant turn: natural-language reply plus a validated Job Spec. */
export const assistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        message: z.string().min(1).max(2000),
        history: z.array(messageSchema).max(24).default([]),
        spec: jobSpecSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { askAssistant, estimate, precheckCompliance } = await import("@/lib/assistant.server");
    const { COUNTIES, NICHES, RECORD_TYPES } = await import("@/lib/mock-data");

    const refusal = precheckCompliance(data.message);
    if (refusal) {
      return {
        reply: `I Can't Set That Up. ${refusal}`,
        spec: data.spec,
        coverage: [],
        suggestedTemplates: [],
        estimate: estimate(data.spec),
        refused: true,
      };
    }

    const covered = COUNTIES.filter((c) => c.coverage !== "requested").map((c) => c.name);
    const result = await askAssistant({
      history: data.history,
      message: data.message,
      spec: data.spec,
      coveredCounties: covered,
      niches: [...NICHES],
      recordTypes: [...RECORD_TYPES],
    });

    // Coverage is decided by real adapter data, never by the model.
    const coverage = result.spec.counties.map((county) => {
      const hit = COUNTIES.find((c) => c.name.toLowerCase() === county.toLowerCase());
      return { county, coverage: (hit?.coverage ?? "unknown") as "live" | "beta" | "requested" | "unknown" };
    });

    return {
      reply: result.reply,
      spec: result.spec,
      coverage,
      suggestedTemplates: result.suggestedTemplates,
      estimate: estimate(result.spec),
    };
  });

/** Log a county the platform does not cover yet, so it lands in the backlog. */
export const requestCoverage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        county: z.string().min(2).max(80),
        recordType: z.string().max(80).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("adapter_requests").insert({
      workspace_id: data.workspaceId,
      county: data.county,
      record_type: data.recordType,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Turn the assembled spec into a real queued job. The conversation is stored on
 * the job for audit: who assembled what, and how.
 */
export const createJobFromSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        spec: jobSpecSchema,
        transcript: z.array(messageSchema).max(60).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const spec = data.spec;
    if (!spec.sourceType) throw new Error("Pick A Source First");
    if (spec.sourceType === "upload") throw new Error("Upload Jobs Start On The Upload Page");
    if (spec.sourceType === "business" && !spec.niches.length) throw new Error("Add At Least One Niche");
    if (spec.sourceType === "records" && !spec.recordType) throw new Error("Pick A Record Type");

    const { COUNTIES } = await import("@/lib/mock-data");
    const blocked = spec.counties.filter((c) => {
      const hit = COUNTIES.find((x) => x.name.toLowerCase() === c.toLowerCase());
      return !hit || hit.coverage === "requested";
    });
    if (blocked.length && spec.sourceType === "records") {
      throw new Error(`Not Covered Yet: ${blocked.join(", ")}. Request It And We'll Add It.`);
    }

    const geoLabel = spec.counties.join(", ") || specStates(spec).join(", ") || "All";
    const name =
      spec.name ??
      (spec.sourceType === "records"
        ? `${spec.recordType} · ${geoLabel}`
        : `${spec.niches.join(", ")} · ${geoLabel}`);

    const { queueJob } = await import("@/lib/job-submit");
    const queued = await queueJob(context.supabase, {
      workspaceId: data.workspaceId,
      sourceType: spec.sourceType,
      params: {
        name,
        niches: spec.niches,
        record_type: spec.recordType,
        state: specStates(spec)[0] ?? null,
        states: specStates(spec),
        counties: spec.counties,
        county: spec.counties[0] ?? null,
        recency_days: spec.recencyDays,
        remove_franchises: spec.removeFranchises,
        dedupe: spec.dedupe,
        mobile_only: spec.mobileOnly,
        skip_trace: spec.skipTrace,
        industry: spec.industry,
        message_angle: spec.messageAngle,
        assembled_by: "ai_assistant",
        assistant_transcript: data.transcript,
      },
    });
    return { jobId: queued.id, duplicate: queued.duplicate };
  });
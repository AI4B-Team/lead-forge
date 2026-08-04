// Property Search → Lead. Saves a property found via the Realeflow search
// page as a lead in the workspace. Lead Forge leads are scoped to a job, so
// each workspace gets one long-lived "Property Search (saved)" container job
// (source_type "records", status "ready") that collects these hand-picked
// leads — they show up on Lists / Job Review / CSV export like any other job.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SEARCH_JOB_PARAMS = { kind: "property_search", name: "Property Search (saved)" };

export const addPropertyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        hash: z.string().min(1),
        fullName: z.string().nullish(),
        address: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        zip: z.string().nullish(),
        realeflow: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1) Find or create the container job for this workspace.
    const { data: existingJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("source_type", "records")
      .contains("params", { kind: "property_search" })
      .maybeSingle();

    let jobId = existingJob?.id;
    if (!jobId) {
      const { data: created, error: createErr } = await supabase
        .from("jobs")
        .insert({
          workspace_id: data.workspaceId,
          source_type: "records",
          status: "ready",
          params: SEARCH_JOB_PARAMS as never,
        })
        .select("id")
        .single();
      if (createErr || !created) throw createErr ?? new Error("Failed to create container job");
      jobId = created.id;
    }

    // 2) Duplicate guard by Realeflow address hash.
    const { data: dup } = await supabase
      .from("leads")
      .select("id")
      .eq("job_id", jobId)
      .eq("source_meta->>rf_hash", data.hash)
      .maybeSingle();
    if (dup) return { duplicate: true as const, jobId };

    // 3) Insert the lead. No phone (records-style lead) → scrub "clean",
    // matching how the pipeline treats phone-less rows.
    const { error: insErr } = await supabase.from("leads").insert({
      workspace_id: data.workspaceId,
      job_id: jobId,
      full_name: data.fullName ?? null,
      phone: null,
      phone_type: "unknown",
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip: data.zip ?? null,
      scrub_status: "clean",
      data_provenance: "verified_source",
      source_meta: {
        rf_hash: data.hash,
        record_type: "Property Search",
        provider: "realeflow-search",
        realeflow: data.realeflow,
      } as never,
    });
    if (insErr) throw insErr;

    // 4) Keep the container job's counters in sync for the review page, and
    // stamp params.last_saved_at so the Lists page can bubble this job to the
    // top with a fresh date (jobs has no updated_at column).
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);
    await supabase
      .from("jobs")
      .update({
        rows_in: count ?? 0,
        rows_deduped: count ?? 0,
        rows_enriched: count ?? 0,
        params: { ...SEARCH_JOB_PARAMS, last_saved_at: new Date().toISOString() } as never,
      })
      .eq("id", jobId);

    return { duplicate: false as const, jobId };
  });

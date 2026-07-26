import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Load a job with its leads counts, scrub run, and computed quality score.
export const getJobReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error || !job) throw new Error("Job Not Found");

    const { data: scrub } = await supabase
      .from("scrub_runs")
      .select("*")
      .eq("job_id", data.jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: total } = await supabase
      .from("leads").select("id", { count: "exact", head: true }).eq("job_id", data.jobId);
    const { count: clean } = await supabase
      .from("leads").select("id", { count: "exact", head: true }).eq("job_id", data.jobId).eq("scrub_status", "clean");
    const { count: dnc } = await supabase
      .from("leads").select("id", { count: "exact", head: true }).eq("job_id", data.jobId).eq("scrub_status", "dnc");
    const { count: litigator } = await supabase
      .from("leads").select("id", { count: "exact", head: true }).eq("job_id", data.jobId).eq("scrub_status", "litigator");
    const { count: mobile } = await supabase
      .from("leads").select("id", { count: "exact", head: true }).eq("job_id", data.jobId).eq("phone_type", "mobile");

    const t = total ?? 0;
    const cleanRate = t ? (clean ?? 0) / t : 0;
    const mobileRate = t ? (mobile ?? 0) / t : 0;
    const reachability = t ? Math.min(1, ((clean ?? 0) + (mobile ?? 0)) / (2 * t)) : 0;
    const quality = Math.round((cleanRate * 0.5 + mobileRate * 0.3 + reachability * 0.2) * 100);

    return {
      job,
      scrub,
      counts: { total: t, clean: clean ?? 0, dnc: dnc ?? 0, litigator: litigator ?? 0, mobile: mobile ?? 0 },
      quality,
    };
  });

// Download leads by bucket. Returns rows -- caller builds CSV in the browser.
export const getLeadsByBucket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      jobId: z.string().uuid(),
      bucket: z.enum(["clean", "dnc", "litigator"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("full_name, business_name, phone, phone_type, email, address, city, state, zip, scrub_status")
      .eq("job_id", data.jobId)
      .eq("scrub_status", data.bucket)
      .limit(50000);
    if (error) throw error;
    return { rows: rows ?? [] };
  });

// Server-enforced compliance gate: creates a campaign only if the source job
// is `ready` and only clean leads are attached. DNC/Litigator are download-only.
export const launchCampaignFromJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      jobId: z.string().uuid(),
      name: z.string().min(1).max(120),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: job, error: jerr } = await supabase
      .from("jobs")
      .select("id, workspace_id, status")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jerr || !job) throw new Error("Job Not Found");
    if (job.status !== "ready") throw new Error("Job Is Not Ready. Scrub Must Complete First.");

    const { count: cleanCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("job_id", data.jobId)
      .eq("scrub_status", "clean");
    if (!cleanCount) throw new Error("No Clean Leads Available.");

    const { data: campaign, error: cerr } = await supabase
      .from("campaigns")
      .insert({
        workspace_id: job.workspace_id,
        source_job_id: data.jobId,
        name: data.name,
        status: "draft",
        daily_cap: 500,
        quiet_hours: { start: "21:00", end: "09:00" },
      })
      .select("id")
      .single();
    if (cerr || !campaign) throw cerr ?? new Error("Campaign create failed");

    // Default 4-touch drip with a single starter variant per step.
    const steps = [
      { step_order: 1, delay_minutes: 0, variants: ["Hi {{first_name}} — quick question about your {{niche}} in {{city}}?"] },
      { step_order: 2, delay_minutes: 2, variants: ["Following up — got a minute today?"] },
      { step_order: 3, delay_minutes: 180, variants: ["Still looking for {{niche}} help in {{city}}? Happy to send info."] },
      { step_order: 4, delay_minutes: 2880, variants: ["Last check-in — want me to close this out?"] },
    ];
    await supabase.from("campaign_steps").insert(
      steps.map((s) => ({ campaign_id: campaign.id, ...s })),
    );

    return { campaignId: campaign.id };
  });
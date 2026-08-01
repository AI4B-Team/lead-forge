import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RESCRUB_DAYS, SCRUB_STALE_MESSAGE, isScrubStale, scrubAgeDays } from "@/lib/compliance-rules";
import { assignJobNames, cadenceBadge } from "@/lib/job-naming";

// List every job for a workspace with lead-bucket counts for the Lists page.
export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, source_type, record_type, status, rows_in, rows_deduped, params, created_at, schedule, next_run_at, last_run_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (jobs ?? []).map((j) => j.id);
    const counts = new Map<string, { clean: number; dnc: number; litigator: number }>();
    for (const id of ids) counts.set(id, { clean: 0, dnc: 0, litigator: 0 });
    // Records added since the previous recurring run (§ recurring search diffing).
    const newSince = new Map<string, number>();
    if (ids.length) {
      const { data: rows } = await supabase
        .from("leads")
        .select("job_id, scrub_status, created_at")
        .in("job_id", ids);
      const lastRunByJob = new Map<string, string | null>(
        (jobs ?? []).map((j) => [j.id, j.last_run_at ?? null]),
      );
      for (const r of rows ?? []) {
        const c = counts.get(r.job_id!);
        if (!c) continue;
        if (r.scrub_status === "clean") c.clean += 1;
        else if (r.scrub_status === "dnc") c.dnc += 1;
        else if (r.scrub_status === "litigator") c.litigator += 1;
        const lastRun = lastRunByJob.get(r.job_id!);
        if (lastRun && r.created_at && new Date(r.created_at) > new Date(lastRun)) {
          newSince.set(r.job_id!, (newSince.get(r.job_id!) ?? 0) + 1);
        }
      }
    }

    return {
      jobs: (jobs ?? []).map((j) => {
        const names = nameMap;
        return {
          id: j.id,
          name: names.get(j.id)?.name ?? `${j.source_type} · ${j.id.slice(0, 8)}`,
          run_index: names.get(j.id)?.runIndex ?? 1,
          cadence_badge: cadenceBadge(j.schedule),
          source_type: j.source_type,
          status: j.status,
          rows_in: j.rows_in ?? 0,
          rows_deduped: j.rows_deduped ?? 0,
          created_at: j.created_at,
          record_type: j.record_type ?? "business",
          schedule: j.schedule ?? "one_time",
          next_run_at: j.next_run_at,
          last_run_at: j.last_run_at,
          new_since_last_run: newSince.get(j.id) ?? 0,
          counts: counts.get(j.id) ?? { clean: 0, dnc: 0, litigator: 0 },
        };
      }),
    };
  });

// Paginated lead browser for the Job Detail drawer.
// Live narration feed for the job progress screen.
export const listJobEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: events, error } = await context.supabase
      .from("job_events")
      .select("id, stage, message, count, created_at")
      .eq("job_id", data.jobId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return { events: events ?? [] };
  });

export const listJobLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      jobId: z.string().uuid(),
      bucket: z.enum(["clean", "dnc", "litigator", "all"]).default("clean"),
      search: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("leads")
      .select("id, full_name, business_name, phone, phone_type, email, city, state, address, scrub_status")
      .eq("job_id", data.jobId)
      .order("full_name", { ascending: true })
      .limit(data.limit);
    if (data.bucket !== "all") q = q.eq("scrub_status", data.bucket);
    if (data.search?.trim()) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`full_name.ilike.${s},business_name.ilike.${s},phone.ilike.${s},email.ilike.${s},city.ilike.${s}`);
    }
    const { data: leads, error } = await q;
    if (error) throw error;
    return { leads: leads ?? [] };
  });

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
      scrubFreshness: {
        scrubbedAt: scrub?.created_at ?? null,
        ageDays: scrubAgeDays(scrub?.created_at ?? null),
        stale: isScrubStale(scrub?.created_at ?? null),
        rescrubDays: RESCRUB_DAYS,
      },
    };
  });

// Pause a running job (§9.5) — the orchestrator stops picking it up.
export const pauseJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("jobs")
      .update({ status: "paused" })
      .eq("id", data.jobId);
    if (error) throw error;
    await context.supabase.from("job_events").insert({
      job_id: data.jobId,
      stage: "paused",
      message: "Job Paused. Nothing Is Discarded — Resume Any Time.",
    } as never);
    return { ok: true };
  });

// Resume a paused or failed job by re-queuing it for the orchestrator.
export const resumeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("jobs")
      .update({ status: "queued" })
      .eq("id", data.jobId);
    if (error) throw error;
    await context.supabase.from("job_events").insert({
      job_id: data.jobId,
      stage: "queued",
      message: "Job Resumed From The Last Completed Stage.",
    } as never);
    return { ok: true };
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

    // §6: a list older than 30 days must be re-scrubbed before it can send.
    const { data: lastScrub } = await supabase
      .from("scrub_runs")
      .select("created_at")
      .eq("job_id", data.jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isScrubStale(lastScrub?.created_at)) throw new Error(SCRUB_STALE_MESSAGE);

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
        list_job_id: data.jobId,
        name: data.name,
        status: "draft",
        daily_cap: 500,
        send_window: { quiet_start: "21:00", quiet_end: "09:00" } as never,
      })
      .select("id")
      .single();
    if (cerr || !campaign) throw cerr ?? new Error("Campaign create failed");

    // Default 4-touch drip with a single starter variant per step.
    const steps = [
      { step_order: 1, delay_minutes: 0, message_variants: ["Hi {{first_name}} — quick question about your {{niche}} in {{city}}?"] },
      { step_order: 2, delay_minutes: 2, message_variants: ["Following up — got a minute today?"] },
      { step_order: 3, delay_minutes: 180, message_variants: ["Still looking for {{niche}} help in {{city}}? Happy to send info."] },
      { step_order: 4, delay_minutes: 2880, message_variants: ["Last check-in — want me to close this out?"] },
    ];
    await supabase.from("campaign_steps").insert(
      steps.map((s) => ({ campaign_id: campaign.id, ...s })),
    );

    return { campaignId: campaign.id };
  });
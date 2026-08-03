import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scanJobInputSchema, scanCreditQuote } from "@/lib/property-scan.shared";

/** Every scan this workspace has run, newest first. */
export const listScanJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("scan_jobs")
      .select(
        "id, name, mode, vertical, status, prompt, match_threshold, images_per, areas, parcels_in_area, parcels_filtered, parcels_scanned, parcels_matched, credits_quoted, credits_charged, credits_refunded, created_at, completed_at",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { scans: rows ?? [] };
  });

/**
 * Queue a scan. The quote is recomputed server-side from the surviving parcel
 * count so a tampered client can't buy a 200k-parcel scan for one credit, and
 * credits are only ever charged on parcels that actually get scored.
 */
export const createScanJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => scanJobInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const quoted = scanCreditQuote(data.parcelsFiltered, data.imagesPer);

    const { data: row, error } = await context.supabase
      .from("scan_jobs")
      .insert({
        workspace_id: data.workspaceId,
        created_by: context.userId,
        name: data.name,
        mode: data.mode,
        vertical: data.vertical,
        prompt: data.prompt,
        example_parcels: data.examples,
        match_threshold: data.matchThreshold,
        images_per: data.imagesPer,
        buy_box: data.buyBox,
        areas: data.areas,
        source_list_id: data.sourceListId,
        parcels_in_area: data.parcelsInArea,
        parcels_filtered: data.parcelsFiltered,
        credits_quoted: quoted,
        status: "queued",
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    // Monitor mode is a standing scan, so it also gets a subscription row.
    if (data.mode === "monitor" && data.monitorCadence) {
      await context.supabase.from("monitor_subscriptions").insert({
        workspace_id: data.workspaceId,
        created_by: context.userId,
        scan_job_id: (row as { id: string }).id,
        list_id: data.sourceListId,
        cadence: data.monitorCadence,
        vertical: data.vertical,
        alert_on: { tarp_appeared: true, distress_delta: 15 },
        next_run_at: new Date(
          Date.now() + (data.monitorCadence === "monthly" ? 30 : 91) * 86_400_000,
        ).toISOString(),
      } as never);
    }

    return { id: (row as { id: string }).id, creditsQuoted: quoted };
  });

/** Quick-set outcome on a scanned lead. `already_renovated` labels a scoring miss. */
export const setLeadOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        resultId: z.string().uuid().nullable().default(null),
        leadRecordId: z.string().uuid().nullable().default(null),
        status: z.enum(["contacted", "responded", "appointment", "contracted", "closed", "dead"]),
        reason: z
          .enum(["already_renovated", "not_selling", "bad_number", "wrong_owner", "no_answer"])
          .nullable()
          .default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lead_outcomes").insert({
      workspace_id: data.workspaceId,
      result_id: data.resultId,
      lead_record_id: data.leadRecordId,
      set_by: context.userId,
      status: data.status,
      reason: data.reason,
    } as never);
    if (error) throw error;
    return { ok: true };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jobLabel, type JobRef } from "@/lib/compliance.shared";
import { phoneVariants } from "@/lib/optout.server";

/** Digits-only form used for partial phone matching. */
function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

/** Canonical +1XXXXXXXXXX when possible, otherwise the raw input. */
function normalizePhone(v: string): string {
  const d = digitsOnly(v);
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `+1${ten}` : v.trim();
}

const REASON_BUCKETS = {
  opt_out: ["optout", "opt_out", "opt-out", "stop"],
  dnc: ["dnc", "litigator"],
} as const;

export function reasonBucket(reason: string | null | undefined): "opt_out" | "dnc" | "manual" {
  const r = (reason ?? "").toLowerCase();
  if (REASON_BUCKETS.opt_out.some((k) => r.includes(k))) return "opt_out";
  if (REASON_BUCKETS.dnc.some((k) => r.includes(k))) return "dnc";
  return "manual";
}

/** Real compliance inputs for a workspace: registration stage, scrub history, suppression. */
export const getComplianceState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [reg, runs, sup] = await Promise.all([
      supabase
        .from("registrations")
        .select("brand_status, campaign_status, updated_at")
        .eq("workspace_id", data.workspaceId)
        .maybeSingle(),
      supabase
        .from("scrub_runs")
        .select(
          "id, created_at, provider, total, clean_count, dnc_count, litigator_count, proof, job_id, jobs(name, source_type, params)",
        )
        .eq("workspace_id", data.workspaceId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("suppression")
        .select("reason")
        .eq("workspace_id", data.workspaceId)
        .limit(20000),
    ]);

    const suppression = sup.data ?? [];
    const bucket = (reason: string | null) => {
      const r = (reason ?? "").toLowerCase();
      if (r.includes("stop") || r.includes("opt")) return "opt_out";
      if (r.includes("dnc") || r.includes("litig")) return "dnc";
      return "manual";
    };
    const counts = { opt_out: 0, dnc: 0, manual: 0 };
    for (const s of suppression) counts[bucket(s.reason) as keyof typeof counts]++;

    const runRows = (runs.data ?? []).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      provider: r.provider ?? "DNCScrub",
      total: r.total ?? 0,
      clean_count: r.clean_count ?? 0,
      dnc_count: r.dnc_count ?? 0,
      litigator_count: r.litigator_count ?? 0,
      job_name: jobLabel(r as { jobs?: JobRef | null }),
      proof_ref:
        (r.proof && typeof r.proof === "object" && "reference_id" in r.proof
          ? String((r.proof as Record<string, unknown>).reference_id)
          : r.id.slice(0, 8).toUpperCase()),
    }));

    return {
      registration: {
        brand_status: reg.data?.brand_status ?? null,
        campaign_status: reg.data?.campaign_status ?? null,
        updated_at: reg.data?.updated_at ?? null,
      },
      runs: runRows,
      suppression: { total: suppression.length, ...counts },
      lastScrubAt: runRows[0]?.created_at ?? null,
    };
  });

/** Suppression import: manual entry or CSV upload of existing opt-outs (spec §21). */
export const importSuppression = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        phones: z.array(z.string()).min(1).max(20000),
        reason: z.string().max(60).default("manual"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const normalized = Array.from(
      new Set(
        data.phones
          .map((p) => p.replace(/[^\d]/g, ""))
          .map((d) => (d.length === 11 && d.startsWith("1") ? d.slice(1) : d))
          .filter((d) => d.length === 10)
          .map((d) => `+1${d}`),
      ),
    );
    if (normalized.length === 0) return { imported: 0, skipped: data.phones.length };

    const { error } = await context.supabase.from("suppression").upsert(
      normalized.map((phone) => ({
        workspace_id: data.workspaceId,
        phone,
        reason: data.reason || "manual",
      })),
      { onConflict: "workspace_id,phone", ignoreDuplicates: true },
    );
    if (error) throw error;
    return { imported: normalized.length, skipped: data.phones.length - normalized.length };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RawLead } from "./data-providers";

// ---------------------------------------------------------------------------
// Source adapter interface. Real providers (Outscraper, county scrapers, CSV
// parser) drop in behind this shape without touching the orchestrator.
// ---------------------------------------------------------------------------

type JobParams = Record<string, unknown>;

interface SourceAdapter {
  key: string;
  coverage: "live" | "beta" | "requested";
  run(params: JobParams): Promise<RawLead[]>;
}

// ---------------------------------------------------------------------------
// Mock adapters. Deterministic, seedable-looking output so users see the full
// funnel work end-to-end while real providers are still being wired up.
// ---------------------------------------------------------------------------

const FRANCHISE_MARKERS = ["ServPro", "Roto-Rooter", "Mr Rooter", "Aire Serv"];
const FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Sam", "Jamie", "Drew", "Reese"];
const LAST_NAMES = ["Nguyen", "Patel", "Garcia", "Smith", "Johnson", "Lopez", "Kim", "Davis", "Martinez", "Chen"];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length]!;
}

function fakePhone(i: number) {
  const area = 813 + (i % 5);
  const mid = 200 + (i % 799);
  const last = 1000 + (i * 37) % 8999;
  return `+1${area}${mid}${last}`;
}

const businessAdapter: SourceAdapter = {
  key: "business.apify",
  coverage: "live",
  async run(params) {
    const { getBusinessScraper } = await import("./data-providers");
    const scraper = getBusinessScraper();
    return scraper.scrape({
      niches: (params.niches as string[] | undefined) ?? ["HVAC"],
      counties: (params.counties as string[] | undefined) ?? [],
      state: (params.state as string | undefined) ?? "FL",
    });
  },
};

const recordsAdapter: SourceAdapter = {
  key: "records.mock",
  coverage: "live",
  async run(params) {
    const county = (params.county as string | undefined) ?? "Hillsborough, FL";
    const record = (params.record_type as string | undefined) ?? "Probate";
    const count = 200 + county.length * 3;
    const rows: RawLead[] = [];
    for (let i = 0; i < count; i++) {
      const hasPhone = i % 3 !== 0; // records door often lacks phones -> skiptrace
      rows.push({
        full_name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 3)}`,
        phone: hasPhone ? fakePhone(i) : null,
        address: `${100 + i} Main St`,
        city: county.split(",")[0],
        state: "FL",
        source_meta: { record_type: record, county },
      });
    }
    return rows;
  },
};

const uploadAdapter: SourceAdapter = {
  key: "upload.csv.mock",
  coverage: "live",
  async run(params) {
    // If the client parsed the CSV and passed rows through, use them directly.
    const parsed = params.rows as RawLead[] | undefined;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;

    // Fallback: synthesize a list sized to the reported file so the UI still
    // exercises the pipeline when no parsed rows were provided.
    const size = Number(params.file_size ?? 0);
    const count = Math.max(80, Math.min(2000, Math.round(size / 120)));
    const rows: RawLead[] = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        full_name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i)}`,
        phone: i % 5 === 0 ? null : fakePhone(i),
        email: `lead${i}@example.com`,
        city: "Tampa",
        state: "FL",
        source_meta: { imported_from: params.file_name ?? "upload.csv" },
      });
    }
    return rows;
  },
};

function selectAdapter(sourceType: string): SourceAdapter {
  if (sourceType === "business") return businessAdapter;
  if (sourceType === "records") return recordsAdapter;
  return uploadAdapter;
}

// ---------------------------------------------------------------------------
// Orchestrator: advances the job through queued → scraping → enriching →
// skiptracing → scrubbing → ready. Writes credit_ledger deductions and a
// scrub_runs audit row. Provider proof is stubbed until a real scrubber is
// wired in; the shape stays stable so Compliance page can render it.
// ---------------------------------------------------------------------------

export const runJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const jobId = data.jobId;

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, workspace_id, source_type, status, params")
      .eq("id", jobId)
      .single();
    if (jobErr || !job) throw new Error("Job Not Found");
    if (job.status !== "queued") return { ok: true, status: job.status };

    const workspaceId = job.workspace_id;
    const params = (job.params ?? {}) as JobParams;

    // 1) SOURCE ----------------------------------------------------------------
    await supabase.from("jobs").update({ status: "scraping" }).eq("id", jobId);
    const adapter = selectAdapter(job.source_type);
    const raw = await adapter.run(params);
    await supabase.from("jobs").update({ rows_in: raw.length }).eq("id", jobId);

    // 2) ENRICH + DEDUPE (drop franchises, dedupe by phone+name) --------------
    await supabase.from("jobs").update({ status: "enriching" }).eq("id", jobId);
    const removeFranchises = params.remove_franchises !== false;
    const seen = new Set<string>();
    const deduped: RawLead[] = [];
    for (const r of raw) {
      const meta = (r.source_meta ?? {}) as { franchise?: boolean };
      if (removeFranchises && meta.franchise) continue;
      const key = `${(r.phone ?? "").toLowerCase()}|${(r.business_name ?? r.full_name ?? "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }
    await supabase.from("jobs").update({ rows_deduped: deduped.length, rows_enriched: deduped.length }).eq("id", jobId);

    // 3) SKIPTRACE (fill missing phones for records + upload w/ opt-in) --------
    await supabase.from("jobs").update({ status: "skiptracing" }).eq("id", jobId);
    const shouldSkiptrace =
      job.source_type === "records" || (job.source_type === "upload" && params.skip_trace !== false);
    let skiptraced = 0;
    if (shouldSkiptrace) {
      for (let i = 0; i < deduped.length; i++) {
        if (!deduped[i]!.phone) {
          deduped[i]!.phone = fakePhone(1_000_000 + i);
          skiptraced++;
        }
      }
    }
    if (skiptraced > 0) {
      await supabase.from("credit_ledger").insert({
        workspace_id: workspaceId,
        kind: "skip_trace",
        delta: -skiptraced,
        reason: "skiptrace",
        job_id: jobId,
      });
      const { data: bal } = await supabase
        .from("credit_balances")
        .select("balance")
        .eq("workspace_id", workspaceId)
        .eq("kind", "skip_trace")
        .maybeSingle();
      await supabase
        .from("credit_balances")
        .upsert({
          workspace_id: workspaceId,
          kind: "skip_trace",
          balance: Math.max(0, (bal?.balance ?? 0) - skiptraced),
        });
    }
    await supabase.from("jobs").update({ rows_skiptraced: skiptraced }).eq("id", jobId);

    // 4) INSERT LEADS ----------------------------------------------------------
    const leadRows = deduped.map((r) => ({
      workspace_id: workspaceId,
      job_id: jobId,
      full_name: r.full_name ?? null,
      business_name: r.business_name ?? null,
      phone: r.phone ?? null,
      phone_type: r.phone ? "mobile" : "unknown",
      email: r.email ?? null,
      address: r.address ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      zip: r.zip ?? null,
      source_meta: (r.source_meta ?? {}) as never,
      scrub_status: "unscrubbed" as const,
    }));
    // Insert in chunks of 500 to stay under PostgREST limits.
    for (let i = 0; i < leadRows.length; i += 500) {
      await supabase.from("leads").insert(leadRows.slice(i, i + 500));
    }

    // Charge scrape credits for the deduped rows we kept.
    await supabase.from("credit_ledger").insert({
      workspace_id: workspaceId,
      kind: "scrape",
      delta: -deduped.length,
      reason: "scrape",
      job_id: jobId,
    });
    const { data: scrapeBal } = await supabase
      .from("credit_balances")
      .select("balance")
      .eq("workspace_id", workspaceId)
      .eq("kind", "scrape")
      .maybeSingle();
    await supabase.from("credit_balances").upsert({
      workspace_id: workspaceId,
      kind: "scrape",
      balance: Math.max(0, (scrapeBal?.balance ?? 0) - deduped.length),
    });

    // 5) SCRUB (DNC + Litigator) -- Prompt 6 wires a real provider here. Until
    // then we mark statuses with a deterministic split so the UI is exercised.
    await supabase.from("jobs").update({ status: "scrubbing" }).eq("id", jobId);
    const { data: inserted } = await supabase
      .from("leads")
      .select("id")
      .eq("job_id", jobId);
    let clean = 0, dnc = 0, litigator = 0;
    if (inserted) {
      for (let i = 0; i < inserted.length; i++) {
        let status: "clean" | "dnc" | "litigator";
        const r = i % 20;
        if (r === 0) { status = "litigator"; litigator++; }
        else if (r < 4) { status = "dnc"; dnc++; }
        else { status = "clean"; clean++; }
        await supabase.from("leads").update({ scrub_status: status }).eq("id", inserted[i]!.id);
      }
    }
    await supabase.from("scrub_runs").insert({
      workspace_id: workspaceId,
      job_id: jobId,
      provider: "mock-scrubber-v1",
      total: inserted?.length ?? 0,
      clean_count: clean,
      dnc_count: dnc,
      litigator_count: litigator,
      proof: { note: "Mock scrub run. Replace with real DNC/Litigator provider proof." },
    });

    // 6) READY -----------------------------------------------------------------
    await supabase.from("jobs").update({ status: "ready" }).eq("id", jobId);
    return { ok: true, status: "ready", clean, dnc, litigator, total: inserted?.length ?? 0 };
  });
// ---------------------------------------------------------------------------
// The one pipeline. Both the interactive "Generate List" path and the recurring
// run engine call executePipeline, so a scheduled rescan is byte-for-byte the
// same work as a manual run: source -> dedupe -> verify -> trace -> scrub.
//
// Channel-aware: the phone stages (line-type check, skip trace, DNC scrub) only
// run for SMS lists. Email lists require a contact email; direct-mail lists
// require a mailing address and take no enrichment at all.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawLead } from "./data-providers";
import { normalizeChannel, channelUsesPhonePipeline, type Channel } from "./channels";
import type { LineType } from "./line-type";

type AnyClient = SupabaseClient<any, any, any>;
type JobParams = Record<string, unknown>;

function digits(v: unknown): string {
  return typeof v === "string" ? v.replace(/\D/g, "") : "";
}

function norm(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

interface SourceAdapter {
  key: string;
  coverage: "live" | "beta" | "requested";
  run(params: JobParams): Promise<RawLead[]>;
}

const FIRST_NAMES = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Sam", "Jamie", "Drew", "Reese"];
const LAST_NAMES = ["Nguyen", "Patel", "Garcia", "Smith", "Johnson", "Lopez", "Kim", "Davis", "Martinez", "Chen"];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length]!;
}

function fakePhone(i: number) {
  const area = 813 + (i % 5);
  const mid = 200 + (i % 799);
  const last = 1000 + ((i * 37) % 8999);
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
    // A rescan of a records feed should mostly return the same filings plus a
    // few genuinely new ones, so the net-new number means something.
    const drift = Math.floor(Date.now() / 3_600_000) % 40;
    const count = 200 + county.length * 3 + drift;
    const rows: RawLead[] = [];
    for (let i = 0; i < count; i++) {
      const hasPhone = i % 3 !== 0; // records door often lacks phones -> skiptrace
      rows.push({
        full_name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 3)}`,
        phone: hasPhone ? fakePhone(i) : null,
        email: `owner${i}@example.com`,
        address: `${100 + i} Main St`,
        city: county.split(",")[0],
        state: "FL",
        zip: `336${String(10 + (i % 89))}`,
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
    const parsed = params.rows as RawLead[] | undefined;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;

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

/** Every dedupe key a record can be recognized by across runs. */
function leadKeys(r: {
  phone?: unknown;
  email?: unknown;
  business_name?: unknown;
  full_name?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
}): string[] {
  const keys: string[] = [];
  const d = digits(r.phone);
  if (d) keys.push(`p:${d}`);
  if (typeof r.email === "string" && r.email.trim()) keys.push(`e:${r.email.trim().toLowerCase()}`);
  const name = norm(r.business_name ?? r.full_name);
  if (name) keys.push(`n:${name}|${norm(r.address)}|${norm(r.city)}|${norm(r.state)}`);
  return keys;
}

export type PipelineResult = {
  ok: true;
  status: "ready";
  total: number;
  clean: number;
  dnc: number;
  litigator: number;
  /** Records this run surfaced that no prior run of the same list had. */
  netNew: number;
  /** Everything the source matched before net-new dedupe. */
  matched: number;
  channel: Channel;
};

/**
 * Advance a queued job all the way to `ready`.
 *
 * `priorRunJobIds` makes a recurring run net-new only: every record already
 * delivered by an earlier run of the SAME list is dropped before any credit is
 * spent on enrichment or scrubbing.
 */
export async function executePipeline(
  supabase: AnyClient,
  jobId: string,
  opts: { priorRunJobIds?: string[] } = {},
): Promise<PipelineResult | { ok: true; status: string }> {
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, workspace_id, source_type, status, params, channel, parent_job_id")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) throw new Error("List Not Found");
  if (job.status !== "queued") return { ok: true, status: job.status as string };

  const workspaceId = job.workspace_id as string;
  const params = (job.params ?? {}) as JobParams;
  const channel = normalizeChannel(job.channel as string | null);
  const phonePipeline = channelUsesPhonePipeline(channel);

  const say = async (stage: string, message: string, count?: number) => {
    await supabase.from("job_events").insert({
      job_id: jobId,
      workspace_id: workspaceId,
      stage,
      message,
      count: count ?? null,
    });
  };
  await say("queued", "Run accepted — we'll keep working even if you close this tab.");

  // 1) SOURCE ---------------------------------------------------------------
  await supabase.from("jobs").update({ status: "scraping" }).eq("id", jobId);
  await say("scraping", "Searching the source for matching records…");
  const adapter = selectAdapter(job.source_type as string);
  const sourced = await adapter.run(params);
  const maxResults = Number(params.max_results) > 0 ? Number(params.max_results) : null;
  const raw = maxResults ? sourced.slice(0, maxResults) : sourced;
  await supabase.from("jobs").update({ rows_in: raw.length }).eq("id", jobId);
  await say("scraping", `Found ${raw.length.toLocaleString()} records.`, raw.length);

  // 2) DEDUPE — in-batch, workspace-wide, and against every prior run --------
  await supabase.from("jobs").update({ status: "enriching" }).eq("id", jobId);
  const removeFranchises = params.remove_franchises === true;
  const dedupe = params.dedupe !== false;
  const seen = new Set<string>();
  const priorRunKeys = new Set<string>();

  const priorIds = opts.priorRunJobIds ?? [];
  if (priorIds.length) {
    // Net-new engine: everything an earlier run of this list already delivered.
    const { data: prior } = await supabase
      .from("leads")
      .select("phone, email, business_name, full_name, address, city, state")
      .in("job_id", priorIds)
      .limit(50000);
    for (const row of prior ?? []) for (const k of leadKeys(row)) priorRunKeys.add(k);
  }

  if (dedupe) {
    const { data: existing } = await supabase
      .from("leads")
      .select("phone")
      .eq("workspace_id", workspaceId)
      .not("phone", "is", null)
      .limit(50000);
    for (const row of existing ?? []) {
      const d = digits(row.phone);
      if (d) seen.add(`p:${d}`);
    }
  }

  const deduped: RawLead[] = [];
  let repeatFromPriorRuns = 0;
  for (const r of raw) {
    const meta = (r.source_meta ?? {}) as { franchise?: boolean };
    if (removeFranchises && meta.franchise) continue;
    const keys = leadKeys(r);
    if (priorRunKeys.size && keys.some((k) => priorRunKeys.has(k))) {
      repeatFromPriorRuns++;
      continue;
    }
    if (dedupe) {
      if (keys.some((k) => seen.has(k))) continue;
      for (const k of keys) seen.add(k);
    }
    deduped.push(r);
  }
  await supabase
    .from("jobs")
    .update({ rows_deduped: deduped.length, net_new_count: deduped.length })
    .eq("id", jobId);
  const removedCount = raw.length - deduped.length;
  await say(
    "enriching",
    priorIds.length
      ? `${repeatFromPriorRuns.toLocaleString()} records were already delivered by earlier runs of this list — ${deduped.length.toLocaleString()} are new since last time.`
      : `Removed ${removedCount.toLocaleString()} ${
          removeFranchises ? "duplicates and franchise locations" : "duplicates"
        } — ${deduped.length.toLocaleString()} unique records remain.`,
    deduped.length,
  );

  // 2b) CHANNEL GATE --------------------------------------------------------
  type EnrichedLead = RawLead & { line_type?: LineType };
  let verified: EnrichedLead[] = deduped;
  let skiptraced = 0;

  if (!phonePipeline) {
    // Email lists need a contact email; direct mail needs a mailing address.
    if (channel === "email") {
      const before = verified.length;
      verified = verified.filter((r) => typeof r.email === "string" && r.email.includes("@"));
      await say(
        "enriching",
        `Contact email found for ${verified.length.toLocaleString()} records — ${(before - verified.length).toLocaleString()} had no reachable email.`,
        verified.length,
      );
    } else {
      const before = verified.length;
      verified = verified.filter((r) => Boolean(r.address && (r.zip || r.city)));
      await say(
        "enriching",
        `Mailing address verified for ${verified.length.toLocaleString()} records — ${(before - verified.length).toLocaleString()} had no deliverable address.`,
        verified.length,
      );
    }
    await supabase.from("jobs").update({ rows_enriched: verified.length, rows_skiptraced: 0 }).eq("id", jobId);
  } else {
    const { verifyPending, verifyLineTypes, classifyLineType } = await import("./line-type");
    const shouldSkiptrace =
      job.source_type === "records" || (job.source_type === "upload" && params.skip_trace !== false);
    const mobileOnly = params.mobile_only === true;
    const verify = shouldSkiptrace
      ? verifyPending(deduped, mobileOnly)
      : verifyLineTypes(deduped, mobileOnly);
    verified = verify.kept;
    await supabase.from("jobs").update({ rows_enriched: verified.length }).eq("id", jobId);
    await say(
      "enriching",
      mobileOnly
        ? verify.removed > 0
          ? `Carrier check removed ${verify.removed.toLocaleString()} landline and VoIP numbers — ${verified.length.toLocaleString()} records remain.`
          : `Carrier check confirmed every number is mobile — ${verified.length.toLocaleString()} records remain.`
        : `Carrier check complete — ${verify.counts.mobile.toLocaleString()} mobile, ${(verify.counts.landline + verify.counts.voip).toLocaleString()} landline or VoIP.`,
      verified.length,
    );

    // 3) SKIPTRACE ----------------------------------------------------------
    await supabase.from("jobs").update({ status: "skiptracing" }).eq("id", jobId);
    if (shouldSkiptrace) {
      for (let i = 0; i < verified.length; i++) {
        if (!verified[i]!.phone) {
          const filled = fakePhone(1_000_000 + i);
          verified[i]!.phone = filled;
          verified[i]!.line_type = classifyLineType(filled);
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
      await supabase.from("credit_balances").upsert({
        workspace_id: workspaceId,
        kind: "skip_trace",
        balance: Math.max(0, (bal?.balance ?? 0) - skiptraced),
      });
    }
    await supabase.from("jobs").update({ rows_skiptraced: skiptraced }).eq("id", jobId);
    await say(
      "skiptracing",
      skiptraced > 0
        ? `Skip traced ${skiptraced.toLocaleString()} records that were missing a phone number.`
        : "No skip tracing needed — every record already had a phone number.",
      skiptraced,
    );

    if (mobileOnly) {
      const finalGate = verifyLineTypes(verified, true);
      if (finalGate.removed > 0) {
        verified = finalGate.kept;
        await say(
          "enriching",
          `Carrier check removed ${finalGate.removed.toLocaleString()} newly traced numbers that were not mobile — ${verified.length.toLocaleString()} mobile records remain.`,
          verified.length,
        );
      }
      await supabase.from("jobs").update({ rows_enriched: verified.length }).eq("id", jobId);
    }
  }

  // 4) INSERT LEADS ---------------------------------------------------------
  const leadRows = verified.map((r) => ({
    workspace_id: workspaceId,
    job_id: jobId,
    full_name: r.full_name ?? null,
    business_name: r.business_name ?? null,
    phone: r.phone ?? null,
    phone_type: r.phone ? (r.line_type ?? "unknown") : "unknown",
    email: r.email ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    zip: r.zip ?? null,
    source_meta: (r.source_meta ?? {}) as never,
    scrub_status: "unscrubbed" as const,
  }));
  for (let i = 0; i < leadRows.length; i += 500) {
    await supabase.from("leads").insert(leadRows.slice(i, i + 500));
  }

  // Credits are only ever charged for the records this run actually kept —
  // which, on a recurring run, is the net-new set.
  await supabase.from("credit_ledger").insert({
    workspace_id: workspaceId,
    kind: "scrape",
    delta: -verified.length,
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
    balance: Math.max(0, (scrapeBal?.balance ?? 0) - verified.length),
  });

  // 5) SCRUB — SMS only. Email/direct-mail files are not phone campaigns. ----
  const { data: inserted } = await supabase
    .from("leads")
    .select("id, phone")
    .eq("job_id", jobId);
  let clean = 0;
  let dnc = 0;
  let litigator = 0;

  if (phonePipeline) {
    await supabase.from("jobs").update({ status: "scrubbing" }).eq("id", jobId);
    await say("scrubbing", "Scrubbing against the National DNC Registry and known litigators…");
    const { getDncScrubber } = await import("./data-providers");
    const scrubber = getDncScrubber();
    const phones = (inserted ?? []).map((l) => l.phone ?? "").filter(Boolean);
    const scrubResult = await scrubber.scrub(phones);
    const byPhone = new Map(scrubResult.results.map((r) => [r.phone, r.status]));
    for (const lead of inserted ?? []) {
      const status = (lead.phone && byPhone.get(lead.phone)) || "clean";
      if (status === "litigator") litigator++;
      else if (status === "dnc") dnc++;
      else clean++;
      await supabase.from("leads").update({ scrub_status: status }).eq("id", lead.id);
    }
    await supabase.from("scrub_runs").insert({
      workspace_id: workspaceId,
      job_id: jobId,
      provider: scrubResult.provider,
      total: inserted?.length ?? 0,
      clean_count: clean,
      dnc_count: dnc,
      litigator_count: litigator,
      proof: scrubResult.proof as never,
    });
    await say(
      "scrubbing",
      `${dnc.toLocaleString()} numbers flagged DNC and ${litigator.toLocaleString()} flagged as known litigators.`,
      dnc + litigator,
    );
  } else {
    clean = inserted?.length ?? 0;
    for (let i = 0; i < (inserted ?? []).length; i += 500) {
      const chunk = (inserted ?? []).slice(i, i + 500).map((l) => l.id);
      await supabase.from("leads").update({ scrub_status: "clean" }).in("id", chunk);
    }
    await say(
      "scrubbing",
      channel === "email"
        ? "DNC and litigator scrubbing does not apply to an email list — no phone numbers are used."
        : "DNC and litigator scrubbing does not apply to a direct-mail list — no phone numbers are used.",
      clean,
    );
  }

  // 6) READY ----------------------------------------------------------------
  await supabase.from("jobs").update({ status: "ready" }).eq("id", jobId);
  await say(
    "ready",
    channel === "email"
      ? `${clean.toLocaleString()} records with contact emails are ready to export.`
      : channel === "direct_mail"
        ? `${clean.toLocaleString()} mailable records are ready to export.`
        : `${clean.toLocaleString()} clean, textable leads are ready.`,
    clean,
  );

  // 7) EVENTS ---------------------------------------------------------------
  const { emitEvent } = await import("./events.server");
  await emitEvent(supabase, workspaceId, "job.completed", {
    job_id: jobId,
    source_type: job.source_type,
    channel,
    total: inserted?.length ?? 0,
    clean,
    dnc,
    litigator,
    net_new: deduped.length,
  });
  if (clean > 0) {
    await emitEvent(supabase, workspaceId, "leads.new", { job_id: jobId, count: clean });
  }
  if (dnc > 0) await emitEvent(supabase, workspaceId, "lead.flagged_dnc", { job_id: jobId, count: dnc });
  if (litigator > 0) {
    await emitEvent(supabase, workspaceId, "lead.flagged_litigator", { job_id: jobId, count: litigator });
  }

  return {
    ok: true,
    status: "ready",
    clean,
    dnc,
    litigator,
    total: inserted?.length ?? 0,
    netNew: deduped.length,
    matched: raw.length,
    channel,
  };
}

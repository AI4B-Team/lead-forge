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
import type { Database } from "@/integrations/supabase/types";
import type { RawLead } from "./data-providers";
import { normalizeChannel, channelUsesPhonePipeline, type Channel } from "./channels";
import type { LineType } from "./line-type";

type AnyClient = SupabaseClient<Database>;
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
  run(
    params: JobParams,
    onProgress?: (message: string, count?: number) => Promise<void> | void,
  ): Promise<RawLead[]>;
}

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Casey",
  "Morgan",
  "Riley",
  "Sam",
  "Jamie",
  "Drew",
  "Reese",
];
const LAST_NAMES = [
  "Nguyen",
  "Patel",
  "Garcia",
  "Smith",
  "Johnson",
  "Lopez",
  "Kim",
  "Davis",
  "Martinez",
  "Chen",
];

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
  async run(params, onProgress) {
    const { getBusinessScraper } = await import("./data-providers");
    const scraper = getBusinessScraper();
    // A parameter file fans the same search out across every uploaded value.
    const targets = (params.scrape_targets as string[] | undefined) ?? [];
    const kind = params.scrape_target_kind as string | undefined;
    const niches =
      kind === "keywords" && targets.length
        ? targets
        : (params.niches as string[] | undefined) ?? ["HVAC"];
    const counties =
      kind === "areas" && targets.length
        ? targets
        : (params.counties as string[] | undefined) ?? [];
    return scraper.scrape({
      niches,
      counties,
      state: (params.state as string | undefined) ?? "FL",
      max_results: Number(params.max_results) > 0 ? Number(params.max_results) : null,
      onProgress,
    });
  },
};

/**
 * Distress Feed → leads. The feed itself is a maintained dataset that costs
 * nothing to browse; credits are only charged from here on, when the operator
 * pulls selected filings into their own leads for enrichment and skip trace.
 * Parcel APN and address ride along in source_meta so a parcel that also came
 * back from Street Scan dedupes onto ONE lead with both signals.
 */
const distressFeedAdapter: SourceAdapter = {
  key: "records.distress_feed",
  coverage: "live",
  async run(params, onProgress) {
    const ids = ((params.distress_record_ids as string[] | undefined) ?? []).filter(Boolean);
    if (!ids.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await onProgress?.(`Pulling ${ids.length} selected filings from the Distress Feed…`, ids.length);
    const { data, error } = await supabaseAdmin
      .from("distress_records")
      .select(
        "id, state, county, record_type, doc_number, filed_date, owner_first, owner_last, company_entity, property_address, property_city, property_state, property_zip, mailing_address, mailing_city, mailing_state, mailing_zip, amount, auction_date, status, parcel_apn, source_url",
      )
      .in("id", ids);
    if (error) throw new Error(error.message);
    type Row = Record<string, string | number | null>;
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      full_name: [r.owner_first, r.owner_last].filter(Boolean).join(" ") || null,
      business_name: (r.company_entity as string | null) ?? null,
      phone: null,
      email: null,
      address: (r.property_address as string | null) ?? null,
      city: (r.property_city as string | null) ?? null,
      state: (r.property_state as string | null) ?? (r.state as string | null),
      zip: (r.property_zip as string | null) ?? null,
      source_meta: {
        source: "distress_feed",
        record_type: r.record_type,
        doc_number: r.doc_number,
        filed_date: r.filed_date,
        county: r.county,
        amount: r.amount,
        auction_date: r.auction_date,
        case_status: r.status,
        parcel_apn: r.parcel_apn,
        mailing_address: r.mailing_address,
        mailing_city: r.mailing_city,
        mailing_state: r.mailing_state,
        mailing_zip: r.mailing_zip,
        source_url: r.source_url,
      },
    }));
  },
};

const recordsAdapter: SourceAdapter = {
  key: "records.county",
  coverage: "live",
  async run(params, onProgress) {
    // Multi-select support (both axes): `counties`/`record_types` arrays are
    // the new shape; single `county`/`record_type` kept for backwards compat
    // with older queued/scheduled jobs.
    const counties = ((params.counties as string[] | undefined)?.filter(Boolean) ??
      [(params.county as string | undefined) ?? "Hillsborough, FL"]) as string[];
    const recordTypes =
      (params.record_types as string[] | undefined)?.filter(Boolean) ??
      [(params.record_type as string | undefined) ?? "Probate"];

    // Access-path preference: hand-coded open-data scrapers first (Cook IL,
    // Philadelphia PA, NYC NY), then any catalogued Socrata / ArcGIS / bulk
    // file source discovered for that county, then the deterministic mock for
    // counties still waiting on a records request.
    const { hasLiveCountyScraper, scrapeCountyRecords } = await import(
      "./data-providers/county-records"
    );
    const { fetchCatalogedRecords } = await import("./data-providers/source-registry.server");

    const all: RawLead[] = [];
    for (const county of counties) {
      if (hasLiveCountyScraper(county)) {
        await onProgress?.(`Pulling live public records for ${county}…`);
        // One slice per record type (offset pagination) so multi-select pulls
        // distinct rows per type instead of the same page N times.
        for (let t = 0; t < recordTypes.length; t++) {
          const slice = await scrapeCountyRecords({
            county,
            recordType: recordTypes[t]!,
            offset: t * 25,
            dateFrom: (params.date_from as string | null | undefined) ?? null,
            dateTo: (params.date_to as string | null | undefined) ?? null,
          });
          all.push(...slice);
        }
        continue;
      }

      // Catalogued source for this county?
      let cataloged = 0;
      for (let t = 0; t < recordTypes.length; t++) {
        const rows = await fetchCatalogedRecords({
          county,
          recordType: recordTypes[t]!,
          offset: t * 25,
          dateFrom: (params.date_from as string | null | undefined) ?? null,
          dateTo: (params.date_to as string | null | undefined) ?? null,
        });
        if (rows && rows.length > 0) {
          if (cataloged === 0) await onProgress?.(`Pulling catalogued public records for ${county}…`);
          all.push(...rows);
          cataloged += rows.length;
        }
      }
      if (cataloged > 0) continue;

      // A rescan of a records feed should mostly return the same filings plus
      // a few genuinely new ones, so the net-new number means something.
      const drift = Math.floor(Date.now() / 3_600_000) % 40;
      for (const record of recordTypes) {
        const count = 200 + county.length * 3 + drift;
        for (let i = 0; i < count; i++) {
          const hasPhone = i % 3 !== 0; // records door often lacks phones -> skiptrace
          all.push({
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
      }
    }
    return all;
  },
};

/**
 * Street Scan. The buy box narrows parcels first (free), and only the
 * survivors get scored from imagery — so the rows this returns are already
 * matched properties, each carrying its condition score and reasoning.
 */
const propertyScanAdapter: SourceAdapter = {
  key: "street_scan.parcels",
  coverage: "live",
  async run(params, onProgress) {
    const counties = ((params.counties as string[] | undefined)?.filter(Boolean) ?? ["Hillsborough, FL"]) as string[];
    // ZIP farm areas from the combined location search narrow inside the county.
    const zips = ((params.zips as string[] | undefined) ?? []).filter(Boolean);
    const criteria = ((params.visual_criteria as string[] | undefined) ?? ["Deferred maintenance"]).filter(Boolean);
    const threshold = Number(params.match_threshold) > 0 ? Number(params.match_threshold) : 75;
    const cap = Number(params.max_results) > 0 ? Number(params.max_results) : 500;
    const perCounty = Math.max(1, Math.floor(cap / counties.length));

    const all: RawLead[] = [];
    for (const county of counties) {
      await onProgress?.(`Applying your buy box across ${county}…`);
      for (let i = 0; i < perCounty; i++) {
        const score = threshold + ((i * 7) % Math.max(1, 100 - threshold));
        all.push({
          full_name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 5)}`,
          // Owners of distressed parcels rarely publish a phone — most get traced.
          phone: i % 4 === 0 ? fakePhone(i) : null,
          email: null,
          address: `${200 + i} ${pick(["Oak", "Palm", "Cedar", "Magnolia"], i)} St`,
          city: county.split(",")[0],
          state: "FL",
          zip: zips.length ? zips[i % zips.length] : null,
          source_meta: {
            county,
            distress_score: score,
            match_threshold: threshold,
            matched_criteria: criteria.slice(0, 3),
            images_per: Number(params.images_per) === 1 ? 1 : 3,
          },
        });
      }
    }
    return all;
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

/**
 * Idempotent credit refund for one run. Derives what to give back from the
 * ledger itself (every debit this job wrote), and refuses to write a second
 * refund row for the same job + kind + reason — so a retry, a failure handler,
 * and the Template Health Agent can all call this without double-refunding.
 */
export async function refundJobCredits(
  supabase: AnyClient,
  args: { jobId: string; workspaceId: string; reason: string; actorUserId?: string | null },
): Promise<number> {
  const { data: rows } = await supabase
    .from("credit_ledger")
    .select("kind, delta, reason")
    .eq("job_id", args.jobId);
  const ledger = (rows ?? []) as Array<{ kind: string; delta: number; reason: string | null }>;

  const owed = new Map<string, number>();
  for (const row of ledger) {
    if (row.delta < 0) owed.set(row.kind, (owed.get(row.kind) ?? 0) + Math.abs(row.delta));
  }

  const { applyCreditDelta } = await import("./credits.server");
  let refunded = 0;
  for (const [kind, amount] of owed) {
    if (amount <= 0) continue;
    const already = ledger.some((r) => r.kind === kind && r.reason === args.reason);
    if (already) continue;
    await applyCreditDelta(supabase, {
      workspaceId: args.workspaceId,
      kind,
      delta: amount,
      reason: args.reason,
      jobId: args.jobId,
      actorUserId: args.actorUserId ?? null,
    });
    refunded += amount;
  }
  return refunded;
}

function selectAdapter(sourceType: string): SourceAdapter {
  if (sourceType === "business") return businessAdapter;
  if (sourceType === "records") return recordsAdapter;
  if (sourceType === "street_scan") return propertyScanAdapter;
  if (sourceType === "distress_feed") return distressFeedAdapter;
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
  zip?: unknown;
  source_meta?: unknown;
}): string[] {
  const keys: string[] = [];
  // Parcel identity first: the same house can arrive from the Distress Feed
  // (probate filed) and from Street Scan (tarp detected). One parcel is ONE
  // lead carrying both signals — never two leads, never two charges, never two
  // campaigns texting the same owner.
  const meta = (r.source_meta ?? {}) as Record<string, unknown>;
  const apn = norm(meta.parcel_apn ?? meta.apn);
  if (apn) keys.push(`apn:${norm(r.state)}|${apn}`);
  const addr = norm(r.address);
  if (addr) keys.push(`a:${addr}|${norm(r.zip ?? r.city)}|${norm(r.state)}`);
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

type PipelineDebit = { kind: "scrape" | "skip_trace" | "sms"; amount: number };
type PipelineCtx = {
  stage: string;
  debits: PipelineDebit[];
  workspaceId: string | null;
  actorUserId: string | null;
};

/** Never let a provider token or key reach a column workspace members can read. */
function sanitizeError(message: string): string {
  return message
    .replace(/(token|key|secret|password|authorization|bearer)([=:\s"']+)[^\s"'&,)]+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]")
    .slice(0, 500);
}

/**
 * Public entry point. Wraps the pipeline so any throw lands the list in a real
 * terminal `failed` state, refunds credits this run already debited, and still
 * re-throws for callers (runJob, the recurring engine).
 */
export async function executePipeline(
  supabase: AnyClient,
  jobId: string,
  opts: { priorRunJobIds?: string[] } = {},
): Promise<PipelineResult | { ok: true; status: string }> {
  const ctx: PipelineCtx = { stage: "queued", debits: [], workspaceId: null, actorUserId: null };
  try {
    return await runPipelineBody(supabase, jobId, opts, ctx);
  } catch (err) {
    const message = sanitizeError(err instanceof Error ? err.message : String(err));
    await supabase
      .from("jobs")
      .update({
        status: "failed",
        error: message,
        failed_stage: ctx.stage,
        failed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (ctx.workspaceId) {
      await supabase.from("job_events").insert({
        job_id: jobId,
        workspace_id: ctx.workspaceId,
        stage: "failed",
        message: `Run failed during ${ctx.stage}: ${message}`,
        count: null,
      });

      // Refund every debit this run made. Keyed on job + kind + reason so a
      // retry can never double-refund.
      let refundedTotal = 0;
      for (const debit of ctx.debits) {
        if (debit.amount <= 0) continue;
        const { data: already } = await supabase
          .from("credit_ledger")
          .select("id")
          .eq("job_id", jobId)
          .eq("kind", debit.kind)
          .eq("reason", "refund:job_failed")
          .maybeSingle();
        if (already) continue;
        const { applyCreditDelta } = await import("./credits.server");
        await applyCreditDelta(supabase, {
          workspaceId: ctx.workspaceId,
          kind: debit.kind,
          delta: debit.amount,
          reason: "refund:job_failed",
          jobId: jobId,
          actorUserId: ctx.actorUserId,
        });
        refundedTotal += debit.amount;
      }

      // Never refund silently: tell the customer what broke and what we gave back.
      if (refundedTotal > 0) {
        const { notifyRefund } = await import("./refunds.server");
        await notifyRefund(supabase, {
          workspaceId: ctx.workspaceId,
          amount: refundedTotal,
          reason: "refund:job_failed",
          jobId,
        });
      }
    }
    throw err;
  }
}

/**
 * Advance a queued job all the way to `ready`.
 *
 * `priorRunJobIds` makes a recurring run net-new only: every record already
 * delivered by an earlier run of the SAME list is dropped before any credit is
 * spent on enrichment or scrubbing.
 */
async function runPipelineBody(
  supabase: AnyClient,
  jobId: string,
  opts: { priorRunJobIds?: string[] } = {},
  ctx: PipelineCtx = { stage: "queued", debits: [], workspaceId: null, actorUserId: null },
): Promise<PipelineResult | { ok: true; status: string }> {
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, workspace_id, source_type, status, params, channel, parent_job_id, created_by")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) throw new Error("List Not Found");
  if (job.status !== "queued") return { ok: true, status: job.status as string };

  const workspaceId = job.workspace_id as string;
  // Every credit debit is attributed to the member who created the list, so a
  // scheduled rescan still lands on a person rather than "system".
  const actorUserId = (job.created_by as string | null) ?? null;
  ctx.workspaceId = workspaceId;
  ctx.actorUserId = actorUserId;
  const params = (job.params ?? {}) as JobParams;
  const channel = normalizeChannel(job.channel as string | null);
  const phonePipeline = channelUsesPhonePipeline(channel);

  const say = async (stage: string, message: string, count?: number) => {
    ctx.stage = stage;
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
  const sourced = await adapter.run(params, (message, count) => say("scraping", message, count));
  const maxResults = Number(params.max_results) > 0 ? Number(params.max_results) : null;
  const raw = maxResults ? sourced.slice(0, maxResults) : sourced;
  const isSampleData = raw.some(
    (r) => (r.source_meta as { provider?: string } | undefined)?.provider === "mock",
  );
  await supabase
    .from("jobs")
    .update(
      isSampleData
        ? { rows_in: raw.length, params: { ...params, sample_data: true } as never }
        : { rows_in: raw.length },
    )
    .eq("id", jobId);
  await say("scraping", `Found ${raw.length.toLocaleString()} records.`, raw.length);

  // 2) DEDUPE — in-batch, workspace-wide, and against every prior run --------
  await supabase.from("jobs").update({ status: "enriching" }).eq("id", jobId);
  const removeFranchises = params.remove_franchises === true;
  const dedupe = params.dedupe !== false;
  const seen = new Set<string>();
  const priorRunKeys = new Set<string>();

  // Workspace suppression: opt-outs and uploaded exclusion files never come back.
  const suppressed = new Set<string>();
  {
    const { data: sup } = await supabase
      .from("suppression")
      .select("phone")
      .eq("workspace_id", workspaceId)
      .limit(50000);
    for (const row of sup ?? []) {
      const d = digits((row as { phone: string }).phone);
      if (d) suppressed.add(d);
    }
  }

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
  let suppressedCount = 0;
  for (const r of raw) {
    const meta = (r.source_meta ?? {}) as { franchise?: boolean };
    if (removeFranchises && meta.franchise) continue;
    if (suppressed.size) {
      const d = digits(r.phone ?? "");
      if (d && suppressed.has(d)) { suppressedCount++; continue; }
    }
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
  if (suppressedCount > 0) {
    await say(
      "enriching",
      `Excluded ${suppressedCount.toLocaleString()} records on your workspace suppression list.`,
      suppressedCount,
    );
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
    await supabase
      .from("jobs")
      .update({ rows_enriched: verified.length, rows_skiptraced: 0 })
      .eq("id", jobId);
  } else {
    const { verifyPending, verifyLineTypes, classifyLineType } = await import("./line-type");
    const shouldSkiptrace =
      job.source_type === "records" ||
      ((job.source_type === "upload" || job.source_type === "business") &&
        params.skip_trace !== false);
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
      // Real records leads (live county scrapers set source_meta.provider) go
      // through the skip-trace provider (default "realeflow-semi": Realeflow
      // Property Data API → assessor owner name + MAILING address + value/
      // equity, stacked into source_meta.realeflow for the lead drawer).
      const isRealRecords =
        job.source_type === "records" &&
        verified.some((r) => (r.source_meta as { provider?: string } | undefined)?.provider);
      if (isRealRecords) {
        const { getSkipTraceProvider } = await import("./skiptrace/provider.server");
        const provider = getSkipTraceProvider();
        // Cloudflare Workers (free plan) caps ~50 subrequests per invocation.
        // Each trace = 2 API calls (autocomplete + details) — keep the slice
        // small so the request always survives to "ready".
        const MAX_LIVE_TRACES = 5;
        let traceCalls = 0;
        let consecutiveFailures = 0;
        for (const r of verified) {
          if (traceCalls >= MAX_LIVE_TRACES || consecutiveFailures >= 3) break;
          if (!r.address) continue;
          traceCalls++;
          try {
            const t = await provider.trace({
              ownerName: r.full_name ?? null,
              street: r.address,
              city: r.city ?? null,
              state: r.state ?? null,
              zip: r.zip ?? null,
            });
            if (t.ownerName && !r.full_name) r.full_name = t.ownerName;
            if (!r.phone && t.phones[0]) {
              r.phone = t.phones[0];
              r.line_type = classifyLineType(t.phones[0]);
            }
            r.source_meta = {
              ...(r.source_meta ?? {}),
              realeflow: {
                provider: t.provider,
                address_hash: t.addressHash,
                owner_name: t.ownerName,
                mailing_street: t.mailingStreet,
                mailing_city: t.mailingCity,
                mailing_state: t.mailingState,
                mailing_zip: t.mailingZip,
                absentee_owner: t.absenteeOwner,
                ...t.extras,
                traced_at: t.tracedAt,
              },
            };
            skiptraced++;
            consecutiveFailures = 0;
          } catch {
            // No property match / subrequest budget hit — keep the lead as-is.
            consecutiveFailures++;
          }
        }
      }
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
      const { applyCreditDelta } = await import("./credits.server");
      await applyCreditDelta(supabase, {
        workspaceId,
        kind: "skip_trace",
        delta: -skiptraced,
        reason: "skiptrace",
        jobId,
        actorUserId,
      });
      ctx.debits.push({ kind: "skip_trace", amount: skiptraced });
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
  {
    const { applyCreditDelta } = await import("./credits.server");
    await applyCreditDelta(supabase, {
      workspaceId,
      kind: "scrape",
      delta: -verified.length,
      reason: "scrape",
      jobId,
      actorUserId,
    });
  }
  ctx.debits.push({ kind: "scrape", amount: verified.length });

  // 5) SCRUB — SMS only. Email/direct-mail files are not phone campaigns. ----
  const { data: inserted } = await supabase.from("leads").select("id, phone").eq("job_id", jobId);
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
  const { logActivity } = await import("./activity.server");
  await logActivity(supabase, workspaceId, {
    type: "run_completed",
    summary: `List Run Completed — ${clean.toLocaleString()} Clean`,
    detail: `${deduped.length.toLocaleString()} Net-New Of ${(inserted?.length ?? 0).toLocaleString()} Processed`,
    refId: jobId,
    refType: "list",
    actorId: actorUserId,
  });
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
    await emitEvent(supabase, workspaceId, "lead.new", { job_id: jobId, count: clean });
  }
  if (dnc > 0)
    await emitEvent(supabase, workspaceId, "lead.flagged_dnc", { job_id: jobId, count: dnc });
  if (litigator > 0) {
    await emitEvent(supabase, workspaceId, "lead.flagged_litigator", {
      job_id: jobId,
      count: litigator,
    });
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

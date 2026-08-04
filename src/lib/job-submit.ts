// Single entry point for queueing a job. A submit is keyed by workspace +
// source + params (within a 2-minute window) so a double-clicked button, a
// retried request, or a double-fired cadence can only ever create one job.
import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = Pick<SupabaseClient, "from">;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== "rows" && k !== "assistant_transcript")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  }
  return value;
}

async function hash(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function buildIdempotencyKey(input: {
  sourceType: string;
  params: Record<string, unknown>;
  windowMs?: number;
}): Promise<string> {
  const windowMs = input.windowMs ?? 120_000;
  const bucket = Math.floor(Date.now() / windowMs);
  return hash(`${input.sourceType}|${bucket}|${JSON.stringify(stable(input.params))}`);
}

export type QueuedJob = { id: string; duplicate: boolean };

/**
 * Insert a job idempotently. If an identical submission already exists the
 * existing job id is returned instead of burning credits on a second run.
 */
export async function queueJob(
  client: AnyClient,
  input: {
    workspaceId: string;
    sourceType: string;
    params: Record<string, unknown>;
    recordType?: string | null;
    schedule?: string | null;
    /** Outreach channel for the finished list — drives pipeline gating. */
    channel?: "sms" | "email" | "direct_mail" | null;
    /** Member who queued this run; every credit debit is attributed to them. */
    createdBy?: string | null;
  },
): Promise<QueuedJob> {
  const key = await buildIdempotencyKey({ sourceType: input.sourceType, params: input.params });
  const row: Record<string, unknown> = {
    workspace_id: input.workspaceId,
    source_type: input.sourceType,
    status: "queued",
    params: input.params,
    idempotency_key: key,
    // Uploads are the customer's own data; every other path runs behind the
    // coverage gate, so anything that reaches here is a verified source.
    data_provenance: input.sourceType === "upload" ? "user_upload" : "verified_source",
  };
  if (input.recordType) row.record_type = input.recordType;
  if (input.channel) row.channel = input.channel;
  if (input.schedule) row.schedule = input.schedule;
  if (input.createdBy) row.created_by = input.createdBy;

  const { data, error } = await client
    .from("jobs")
    .insert(row as never)
    .select("id")
    .single();

  if (!error && data) {
    const id = (data as { id: string }).id;
    const { logActivity } = await import("./activity.server");
    await logActivity(client, input.workspaceId, {
      type: "list_built",
      summary: "List Built And Queued",
      detail: `Source: ${input.sourceType}`,
      refId: id,
      refType: "list",
      actorId: input.createdBy ?? null,
    });
    return { id, duplicate: false };
  }

  // Unique violation => the same submission already created a job.
  if (error && (error as { code?: string }).code === "23505") {
    const { data: existing } = await client
      .from("jobs")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existing) return { id: (existing as { id: string }).id, duplicate: true };
  }
  throw error ?? new Error("Could Not Queue List");
}
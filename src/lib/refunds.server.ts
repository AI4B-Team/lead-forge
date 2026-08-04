/**
 * Every refund the system makes gets surfaced to the customer. A silent refund
 * looks identical to a silent overcharge from the outside, so this is the single
 * place that fans one refund out to all three channels:
 *
 *   1. in-app notification  (always, for source failures)
 *   2. credit history       (the ledger row's reason, rendered by refunds.shared)
 *   3. email                (only above the workspace's refund_email_threshold,
 *                            so small refunds don't train people to ignore us)
 *
 * Per-record skips deliberately do NOT come through here — they roll up into the
 * job summary via `skipSummaryCopy`.
 */

import {
  DEFAULT_REFUND_EMAIL_THRESHOLD,
  refundClassOf,
  sourceRefundCopy,
} from "@/lib/refunds.shared";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Client = { from: (table: string) => any };

export type RefundNotice = {
  workspaceId: string;
  amount: number;
  reason: string;
  jobId?: string | null;
  /** Human label for the source, e.g. "Google Maps Businesses". */
  sourceLabel?: string | null;
  listName?: string | null;
  /** True when the health check caught it before the customer noticed. */
  proactive?: boolean;
};

/** Resolves the source's display name from the list's template, best-effort. */
export async function sourceLabelForJob(db: Client, jobId: string | null | undefined): Promise<{
  label: string;
  listName: string | null;
}> {
  if (!jobId) return { label: "A source we rely on", listName: null };
  try {
    const { data } = await db.from("jobs").select("name, params, source_type").eq("id", jobId).maybeSingle();
    const job = data as { name: string | null; params: Record<string, unknown> | null; source_type: string } | null;
    const templateId = (job?.params as { template_id?: string } | null)?.template_id;
    if (templateId) {
      const { TEMPLATES } = await import("@/lib/templates");
      const t = TEMPLATES.find((x) => x.id === templateId);
      if (t) return { label: t.title, listName: job?.name ?? null };
    }
    const bySource: Record<string, string> = {
      business: "Business listings",
      local: "Local search",
      records: "County records",
      street_scan: "Street scanning",
      upload: "Your uploaded file",
    };
    return { label: bySource[job?.source_type ?? ""] ?? "A source we rely on", listName: job?.name ?? null };
  } catch {
    return { label: "A source we rely on", listName: null };
  }
}

async function emailThreshold(db: Client, workspaceId: string): Promise<number> {
  try {
    const { data } = await db
      .from("workspaces")
      .select("refund_email_threshold")
      .eq("id", workspaceId)
      .maybeSingle();
    const v = (data as { refund_email_threshold: number | null } | null)?.refund_email_threshold;
    return typeof v === "number" && v > 0 ? v : DEFAULT_REFUND_EMAIL_THRESHOLD;
  } catch {
    return DEFAULT_REFUND_EMAIL_THRESHOLD;
  }
}

/**
 * Announce one refund. Never throws — a failed notification must not roll back
 * a refund that already landed in the ledger.
 */
export async function notifyRefund(db: Client, notice: RefundNotice): Promise<void> {
  if (notice.amount <= 0) return;
  if (refundClassOf(notice.reason) === "skip") return; // rolled into the job summary

  const resolved = notice.sourceLabel
    ? { label: notice.sourceLabel, listName: notice.listName ?? null }
    : await sourceLabelForJob(db, notice.jobId);

  const copy = sourceRefundCopy({
    sourceLabel: resolved.label,
    amount: notice.amount,
    proactive: notice.proactive,
    listName: notice.listName ?? resolved.listName,
  });

  try {
    await db.from("notifications").insert({
      workspace_id: notice.workspaceId,
      kind: "credits_refunded",
      title: copy.title,
      body: copy.body,
      job_id: notice.jobId ?? null,
    });
  } catch (err) {
    console.error("[refunds] notification insert failed:", err);
  }

  // Activity feed keeps the operational trail next to the run itself.
  try {
    await db.from("activity_events").insert({
      workspace_id: notice.workspaceId,
      type: "credits_refunded",
      summary: copy.title,
      detail: copy.body,
      ref_id: notice.jobId ?? null,
      ref_type: notice.jobId ? "job" : null,
    });
  } catch {
    /* the notification is the customer-facing record; this is just the trail */
  }

  const threshold = await emailThreshold(db, notice.workspaceId);
  if (notice.amount < threshold) return;

  // Big refunds also earn an email. Delivery runs through Lovable-managed email
  // once a sending domain is verified; until then the intent is recorded here so
  // nothing is lost and the outcome stays auditable.
  try {
    await db.from("events").insert({
      workspace_id: notice.workspaceId,
      type: "refund_email",
      payload: {
        subject: copy.title,
        body: copy.body,
        amount: notice.amount,
        reason: notice.reason,
        job_id: notice.jobId ?? null,
        threshold,
      },
    });
  } catch (err) {
    console.error("[refunds] refund email event insert failed:", err);
  }
}

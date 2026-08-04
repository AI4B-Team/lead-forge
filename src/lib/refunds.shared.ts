/**
 * Plain-language refund copy. Browser and server both read from here so the
 * notification, the credit history row, and the email all say the same thing.
 *
 * Two refund classes, deliberately worded differently:
 *  - "source"  — the template broke, an actor errored, a portal changed. Our
 *    fault, so the copy owns it and says what we did about it.
 *  - "skip"    — a per-record refusal (no imagery, address not found). Normal
 *    operation on most runs, so the copy is routine and rolls into the job
 *    summary instead of firing its own notification.
 */

import { REFUSAL_CODES } from "@/lib/property-scan.shared";

export type RefundClass = "source" | "skip" | "other";

/** Ledger reasons we write. Anything else falls through to a generic label. */
export const REFUND_REASONS = {
  job_failed: "refund:job_failed",
  template_broken: "refund:template_broken",
  records_skipped: "refund:records_skipped",
} as const;

export function refundClassOf(reason: string | null | undefined): RefundClass {
  const r = (reason ?? "").toLowerCase();
  if (!r.startsWith("refund")) return "other";
  if (r.includes("template_broken") || r.includes("job_failed") || r.includes("source")) return "source";
  if (r.includes("records_skipped") || r.includes("skipped") || r.includes("refusal")) return "skip";
  return "other";
}

/**
 * Human-readable credit-history label. Never render a raw slug — a customer
 * reading their statement should not have to decode `refund:job_failed`.
 */
export function ledgerReasonLabel(reason: string | null | undefined): string {
  const r = (reason ?? "").trim();
  if (!r) return "Usage";
  const map: Record<string, string> = {
    "refund:job_failed": "Refunded — source unavailable",
    "refund:template_broken": "Refunded — source stopped working",
    "refund:records_skipped": "Refunded — records that couldn't be checked",
    scrape: "List build",
    skip_trace: "Skip trace",
    sms: "Messaging",
    topup: "Credits added",
    grant: "Credits added",
    manual_adjustment: "Manual adjustment",
  };
  if (map[r]) return map[r];
  if (r.startsWith("refund:")) return "Refunded";
  // Fall back to a readable version of the slug rather than the slug itself.
  return r.replace(/^[a-z]+:/, "").replace(/[_:-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** Copy for a source-failure refund — the one that needs an apology. */
export function sourceRefundCopy(args: {
  sourceLabel: string;
  amount: number;
  /** Set when the daily health check caught it before the customer did. */
  proactive?: boolean;
  listName?: string | null;
}): { title: string; body: string } {
  const credits = `${args.amount.toLocaleString()} ${args.amount === 1 ? "credit" : "credits"}`;
  const list = args.listName ? ` on “${args.listName}”` : "";
  if (args.proactive) {
    return {
      title: "We Refunded Your Credits",
      body: `Our daily check found that ${args.sourceLabel} stopped returning data. We refunded ${credits}${list} and flagged the source — you don't need to do anything.`,
    };
  }
  return {
    title: "Credits Refunded",
    body: `${args.sourceLabel} returned no results${list}. We've refunded ${credits} and flagged the source so it isn't offered again until it's working.`,
  };
}

/**
 * Routine roll-up for per-record skips. One line for the whole run — we never
 * fire a notification per skipped record.
 */
export function skipSummaryCopy(args: {
  count: number;
  noun?: string;
  credits?: number;
}): string {
  if (args.count <= 0) return "";
  const noun = args.noun ?? "records";
  const one = args.count === 1;
  const credits =
    args.credits && args.credits > 0
      ? ` (${args.credits.toLocaleString()} ${args.credits === 1 ? "credit" : "credits"} back)`
      : "";
  return `${args.count.toLocaleString()} ${one ? noun.replace(/s$/, "") : noun} couldn't be checked and weren't charged${credits}.`;
}

/** Per-skip explanation, grouped for the job summary. */
export function skipReasonLabel(code: string | null | undefined): string {
  const found = REFUSAL_CODES.find((c) => c.code === code);
  return found?.label ?? "Couldn't be checked";
}

/** Above this many credits a refund also earns an email, so email stays rare. */
export const DEFAULT_REFUND_EMAIL_THRESHOLD = 100;

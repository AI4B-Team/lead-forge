/**
 * Free tier — browser-safe rules.
 *
 * The Free plan exists to let someone prove the data is real before they ever
 * enter a card: 50 Distress Feed records, plus unlimited Contact Details
 * Scraper and Universal Site Crawler (both cost us nothing per lead). Anything
 * with a real per-lead cost of goods — skip trace, SMS sending, paid source
 * templates — requires a payment method on file. That's the whole boundary.
 */

export const FREE_PLAN = "free";

/** Distress Feed records a Free workspace may pull into its own leads, ever. */
export const FREE_RECORD_ALLOWANCE = 50;

/** Templates a Free workspace can run without limit (0 credits per lead). */
export const FREE_TEMPLATE_IDS = ["contact-details", "universal-crawl"] as const;

export type FreeGate =
  | "paid_template"
  | "skip_trace"
  | "sms_sending"
  | "record_allowance";

export type PlanContext = {
  plan: string;
  cardOnFile: boolean;
  freeRecordsUsed: number;
};

export function isFreePlan(plan: string | null | undefined): boolean {
  return (plan ?? FREE_PLAN) === FREE_PLAN;
}

/** True when the workspace still has to add a card before spending anything. */
export function needsCard(ctx: PlanContext): boolean {
  return isFreePlan(ctx.plan) && !ctx.cardOnFile;
}

export function freeRecordsLeft(ctx: PlanContext): number {
  if (!needsCard(ctx)) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_RECORD_ALLOWANCE - ctx.freeRecordsUsed);
}

export function isFreeTemplate(templateId: string | null | undefined): boolean {
  return FREE_TEMPLATE_IDS.includes((templateId ?? "") as (typeof FREE_TEMPLATE_IDS)[number]);
}

export const GATE_MESSAGE: Record<FreeGate, string> = {
  paid_template:
    "This source costs credits per lead, so it needs a payment method on file. The Distress Feed, Contact Details Scraper and Universal Site Crawler stay free.",
  skip_trace:
    "Skip trace is billed per hit, so it needs a payment method on file. You can still build and export the list without it.",
  sms_sending:
    "Sending SMS needs a payment method on file — carriers bill us per message.",
  record_allowance: `The Free plan includes ${FREE_RECORD_ALLOWANCE} Distress Feed records. Add a payment method to keep pulling.`,
};

/**
 * The one gate check. Returns null when allowed, otherwise the reason — every
 * server path that spends money calls this so the boundary can't drift.
 */
export function freeGate(
  ctx: PlanContext,
  action: {
    templateId?: string | null;
    creditCostPerLead?: number | null;
    skipTrace?: boolean;
    sendingSms?: boolean;
    recordsRequested?: number;
  },
): { gate: FreeGate; message: string } | null {
  if (!needsCard(ctx)) return null;

  if (action.sendingSms) return { gate: "sms_sending", message: GATE_MESSAGE.sms_sending };
  if (action.skipTrace) return { gate: "skip_trace", message: GATE_MESSAGE.skip_trace };

  if (action.recordsRequested && action.recordsRequested > freeRecordsLeft(ctx)) {
    return { gate: "record_allowance", message: GATE_MESSAGE.record_allowance };
  }

  const cost = action.creditCostPerLead ?? 0;
  if (cost > 0 && !isFreeTemplate(action.templateId)) {
    return { gate: "paid_template", message: GATE_MESSAGE.paid_template };
  }
  return null;
}

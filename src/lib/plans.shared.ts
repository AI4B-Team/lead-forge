/**
 * Canonical subscription catalog. The marketing pricing page, the in-app
 * billing page and every allowance check read these numbers so a tier means
 * exactly one thing everywhere. Prices are USD; annual billing is -20%.
 */
export const ANNUAL_DISCOUNT = 0.2;

export type PlanId = "free" | "starter" | "growth" | "scale" | "comped";

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly platform fee. Free and comped workspaces pay $0 platform fee. */
  monthly: number;
  blurb: string;
  /** Lead credits included each month (one credit = one fully processed record). */
  leadCredits: number;
  /** Overage price per 1,000 lead credits beyond the monthly allowance. */
  overagePer1k: number;
  /** Flat per-segment SMS price — never multiplied by segment count tiers. */
  smsPerSegment: number;
  /** Sending numbers included; extras are $1.50/mo each with no cap. */
  numbersIncluded: number;
  /** Seats included; null means unlimited. */
  seats: number | null;
  /** Skip trace is always metered, never bundled into the lead allowance. */
  skipTrace: { includedPerDay: number; includedPerMonth: number; meteredRate: number };
};

export const EXTRA_NUMBER_MONTHLY = 1.5;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthly: 0,
    blurb: "Try Sourcing With A Capped Record Allowance.",
    leadCredits: 0,
    overagePer1k: 20,
    smsPerSegment: 0.012,
    numbersIncluded: 0,
    seats: 1,
    skipTrace: { includedPerDay: 0, includedPerMonth: 0, meteredRate: 0.06 },
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 97,
    blurb: "Perfect For Solo Operators.",
    leadCredits: 2_500,
    overagePer1k: 20,
    smsPerSegment: 0.012,
    numbersIncluded: 5,
    seats: 1,
    skipTrace: { includedPerDay: 0, includedPerMonth: 0, meteredRate: 0.06 },
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthly: 197,
    blurb: "For Teams Running Outreach Every Day.",
    leadCredits: 8_000,
    overagePer1k: 18,
    smsPerSegment: 0.011,
    numbersIncluded: 15,
    seats: 5,
    skipTrace: { includedPerDay: 300, includedPerMonth: 3_000, meteredRate: 0.05 },
  },
  scale: {
    id: "scale",
    name: "Scale",
    monthly: 497,
    blurb: "Built For Agencies And High-Volume Operations.",
    leadCredits: 20_000,
    overagePer1k: 15,
    smsPerSegment: 0.01,
    numbersIncluded: 50,
    seats: null,
    skipTrace: { includedPerDay: 1_000, includedPerMonth: 10_000, meteredRate: 0.04 },
  },
  comped: {
    id: "comped",
    name: "Comped",
    monthly: 0,
    blurb: "Platform Fee Waived. Usage Fees Still Apply.",
    leadCredits: 20_000,
    overagePer1k: 15,
    smsPerSegment: 0.01,
    numbersIncluded: 50,
    seats: null,
    skipTrace: { includedPerDay: 1_000, includedPerMonth: 10_000, meteredRate: 0.04 },
  },
};

/** Tiers offered for self-serve upgrade, in display order. */
export const SELLABLE_PLANS: Plan[] = [PLANS.starter, PLANS.growth, PLANS.scale];

/** `workspaces.billing_plan` is free-form text; map it onto a known tier. */
export function planFor(billingPlan: string | null | undefined): Plan {
  const key = (billingPlan ?? "").toLowerCase().trim();
  if (key in PLANS) return PLANS[key as PlanId];
  // Legacy / transitional values.
  if (key === "trial") return PLANS.free;
  if (key === "paid") return PLANS.growth;
  if (key === "team" || key === "business" || key === "agency" || key === "enterprise")
    return PLANS.scale;
  return PLANS.free;
}

/** Whether the monthly platform fee is billed for this workspace. */
export function chargesPlatformFee(billingPlan: string | null | undefined): boolean {
  const plan = planFor(billingPlan);
  const key = (billingPlan ?? "").toLowerCase().trim();
  return plan.monthly > 0 && key !== "comped";
}

export function annualMonthly(monthly: number): number {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT));
}

export function annualTotal(monthly: number): number {
  return annualMonthly(monthly) * 12;
}

/** Past-due workspaces keep their tier but lose sending until payment clears. */
export function isPastDue(billingPlan: string | null | undefined): boolean {
  return (billingPlan ?? "").toLowerCase().trim() === "past_due";
}

// --- Credit packs -----------------------------------------------------------
// Top-ups are priced per 1,000 units so the dollar figure on the button is the
// real charge once a payment provider is connected.

export type CreditKind = "scrape" | "skip_trace" | "sms";

export const CREDIT_PACKS: Record<
  CreditKind,
  { label: string; unit: string; pricePerThousand: number; presets: number[] }
> = {
  scrape: { label: "Lead Credits", unit: "Records", pricePerThousand: 20, presets: [1_000, 5_000, 25_000] },
  skip_trace: { label: "Skip Trace", unit: "Lookups", pricePerThousand: 50, presets: [500, 2_500, 10_000] },
  sms: { label: "SMS", unit: "Segments", pricePerThousand: 11, presets: [1_000, 10_000, 50_000] },
};

/** Dollar cost of a top-up, rounded to cents. */
export function packPrice(kind: CreditKind, amount: number): number {
  return Math.round((amount / 1000) * CREDIT_PACKS[kind].pricePerThousand * 100) / 100;
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Overage owed on lead credits used beyond the monthly allowance. */
export function overageCost(plan: Plan, creditsUsed: number): number {
  const over = Math.max(0, creditsUsed - plan.leadCredits);
  if (over === 0) return 0;
  return Math.round((over / 1000) * plan.overagePer1k * 100) / 100;
}

/** Monthly cost of sending numbers beyond the tier's included pool. */
export function extraNumbersCost(plan: Plan, numbers: number): number {
  return Math.max(0, numbers - plan.numbersIncluded) * EXTRA_NUMBER_MONTHLY;
}

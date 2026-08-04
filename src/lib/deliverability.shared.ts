/**
 * Pure per-number deliverability math. Browser-safe on purpose: the Numbers
 * page renders the same delivery-rate and daily-cap numbers the runner enforces,
 * so both sides must read from one implementation.
 */

/** Age-based warmup ceiling. Section 2 of the Telnyx build spec. */
export function warmupCap(activatedAt: string | Date): number {
  const ageDays = Math.floor((Date.now() - new Date(activatedAt).getTime()) / 86_400_000);
  if (ageDays <= 1) return 200;
  if (ageDays <= 4) return 500;
  if (ageDays <= 9) return 1500;
  return 8000;
}

/** Minimum receipts before a delivery rate is trusted enough to pause a number. */
export const MIN_SAMPLE_FOR_PAUSE = 50;

export type NumberHealth = {
  deliveryRate: number | null;
  sample: number;
  status: "good" | "watch" | "poor" | "unknown";
};

export function numberHealth(n: {
  delivered_count?: number | null;
  failed_count?: number | null;
  min_delivery_rate?: number | null;
}): NumberHealth {
  const delivered = n.delivered_count ?? 0;
  const failed = n.failed_count ?? 0;
  const sample = delivered + failed;
  if (sample === 0) return { deliveryRate: null, sample: 0, status: "unknown" };
  const rate = delivered / sample;
  const floor = n.min_delivery_rate ?? 0.75;
  return {
    deliveryRate: rate,
    sample,
    status: rate < floor ? "poor" : rate < floor + 0.1 ? "watch" : "good",
  };
}

/**
 * Per-DID daily send cap. Warmup age sets the ceiling; an operator override may
 * only ever LOWER it, never push a brand-new number past warmup.
 */
export function perNumberDailyCap(n: {
  activated_at?: string | Date | null;
  daily_cap_override?: number | null;
}): number {
  const ceiling = warmupCap(n.activated_at ?? new Date());
  const override = n.daily_cap_override;
  if (typeof override === "number" && override > 0) return Math.min(override, ceiling);
  return ceiling;
}

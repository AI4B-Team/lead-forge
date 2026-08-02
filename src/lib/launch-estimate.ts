/**
 * The "money moment" on the results page: what launching this list will
 * actually reach and cost. Rates follow the pricing model (flat SMS per
 * segment, never multiplied by tier).
 */
export const SMS_RATE_PER_SEGMENT = 0.012;

/** Default drip sequence length used for the pre-launch estimate. */
export const DEFAULT_SEQUENCE_STEPS = 4;

export function launchEstimate(cleanLeads: number, steps = DEFAULT_SEQUENCE_STEPS) {
  const reach = Math.max(0, Math.round(cleanLeads));
  const messages = reach * steps;
  return {
    reach,
    steps,
    messages,
    cost: messages * SMS_RATE_PER_SEGMENT,
  };
}

export function formatUsd(amount: number) {
  return amount < 1 && amount > 0
    ? `$${amount.toFixed(2)}`
    : amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}